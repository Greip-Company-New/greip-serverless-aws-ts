#!/bin/bash
# =============================================================================
# Despliegue completo de la infraestructura de GREIP COMPANY (cuenta 918897411288)
#
# Orden: VPC -> IAM (compartido) -> Storage -> IAM backup -> Postgres (EC2) -> Frontend
#
# DEV usa los nombres de stack legacy (greip-vpc, greip-storage, greip-iam-backup);
# QA/PROD usan sufijo (greip-vpc-QA, greip-storage-PROD, ...).
#
# Uso:
#   ENVIRONMENT=DEV bash deploy-all.sh                          # defaults
#   ENVIRONMENT=QA  bash deploy-all.sh <profile> <region> <OfficeIp> [OpenToInternet] [KEY_NAME]
#       OfficeIp:        tu IP publica (se le agrega /32) para 5432 y SSH (22)
#       OpenToInternet:  'true' abre 5432 y SSH (22) a 0.0.0.0/0 (solo DEV)
#       KEY_NAME:        keypair EC2 opcional (para QA/PROD no hace falta; usa SSM)
# =============================================================================
set -euo pipefail

PROFILE=${1:-devGreipCompany}
REGION=${2:-us-east-2}
OFFICE_IP=${3:-}
OPEN_TO_INTERNET=${4:-false}
KEY_NAME=${5:-}
ENVIRONMENT=${ENVIRONMENT:-DEV}
export ENVIRONMENT
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "${ENVIRONMENT}" in
  DEV|QA|PROD) ;;
  *) echo "ERROR: ENVIRONMENT no soportado: ${ENVIRONMENT} (DEV|QA|PROD)" >&2; exit 1 ;;
esac

case "${ENVIRONMENT}" in
  DEV)  BUCKET_SUFFIX=dev ;;
  QA)   BUCKET_SUFFIX=qa ;;
  PROD) BUCKET_SUFFIX=prod ;;
esac

# Nombre de stack por tipo: sin sufijo en DEV (legacy), con sufijo en QA/PROD.
stack_name() {
  if [ "${ENVIRONMENT}" = "DEV" ]; then
    echo "greip-${1}"
  else
    echo "greip-${1}-${ENVIRONMENT}"
  fi
}

echo "=============================================="
echo " GREIP COMPANY - Infraestructura (${ENVIRONMENT})"
echo " Perfil: ${PROFILE} | Region: ${REGION}"
echo "=============================================="

echo ""
echo "[1/5] Desplegando VPC (subnets, SGs, endpoints) ..."
VPC_PARAMS=(Environment=${ENVIRONMENT} OpenToInternet=${OPEN_TO_INTERNET})
if [ -n "${OFFICE_IP}" ]; then
  case "${OFFICE_IP}" in
    */*) VPC_PARAMS+=(OfficeIp=${OFFICE_IP}) ;;
    *)   VPC_PARAMS+=(OfficeIp=${OFFICE_IP}/32) ;;
  esac
  echo "      Con acceso externo desde ${OFFICE_IP}"
fi
if [ "${OPEN_TO_INTERNET}" = "true" ]; then
  echo "      ACCESO ABIERTO A INTERNET: 5432 y SSH(22) desde 0.0.0.0/0"
fi
aws cloudformation deploy \
  --stack-name "$(stack_name vpc)" \
  --template-file "${ROOT_DIR}/vpc/vpc.yml" \
  --parameter-overrides "${VPC_PARAMS[@]}" \
  --region ${REGION} --profile ${PROFILE} \
  --capabilities CAPABILITY_IAM

echo ""
echo "[2/5] Desplegando IAM compartido (lambda-vpc-role, una sola vez) ..."
if aws cloudformation describe-stacks --stack-name greip-iam --region ${REGION} --profile ${PROFILE} >/dev/null 2>&1; then
  echo "      greip-iam ya existe (es global para toda la cuenta); se omite."
else
  aws cloudformation deploy \
    --stack-name greip-iam \
    --template-file "${ROOT_DIR}/iam/lambda-vpc-role.yml" \
    --parameter-overrides Environment=${ENVIRONMENT} \
    --region ${REGION} --profile ${PROFILE} \
    --capabilities CAPABILITY_NAMED_IAM
fi

echo ""
echo "[3/5] Desplegando Storage (DynamoDB + S3) ..."
aws cloudformation deploy \
  --stack-name "$(stack_name storage)" \
  --template-file "${ROOT_DIR}/storage/storage.yml" \
  --parameter-overrides Environment=${ENVIRONMENT} BucketSuffix=${BUCKET_SUFFIX} \
  --region ${REGION} --profile ${PROFILE} \
  --capabilities CAPABILITY_IAM

echo ""
echo "[4/5] Desplegando IAM backup EC2 (rol + instance profile) ..."
aws cloudformation deploy \
  --stack-name "$(stack_name iam-backup)" \
  --template-file "${ROOT_DIR}/iam/ec2-backup-role.yml" \
  --parameter-overrides Environment=${ENVIRONMENT} BucketSuffix=${BUCKET_SUFFIX} \
  --region ${REGION} --profile ${PROFILE} \
  --capabilities CAPABILITY_NAMED_IAM

echo ""
echo "[5/6] Desplegando EC2 PostgreSQL ..."
bash "${ROOT_DIR}/postgres-ec2/deploy.sh" ${PROFILE} ${REGION} ${OFFICE_IP} ${KEY_NAME}

echo ""
echo "[6/6] Desplegando Frontend (CloudFront + S3, us-east-1) ..."
bash "${ROOT_DIR}/frontend/deploy.sh" ${PROFILE} us-east-1 ${BUCKET_SUFFIX} "appdev.greip.com.pe"

echo ""
echo "=============================================="
echo " Infraestructura ${ENVIRONMENT} desplegada."
echo ""
echo " Para desplegar el frontend (build + S3):"
echo "   cd greip-app-web-react && bash scripts/deploy.sh"
echo ""
echo " Ver infra/README.md"
echo "=============================================="
