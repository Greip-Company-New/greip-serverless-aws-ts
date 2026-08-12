#!/bin/bash
# =============================================================================
# Despliegue del frontend de GREIP COMPANY: ACM cert + S3 + CloudFront
#
# CloudFront requiere que el certificado ACM este en us-east-1,
# por eso toda la infraestructura de frontend va en esa region.
#
# Uso:
#   bash deploy.sh                                    # DEV con valores por defecto
#   bash deploy.sh devGreipCompany us-east-1 dev appdev.greip.com.pe
#
# Variables de entorno:
#   CERT_ARN   (opcional) ARN del certificado ACM existente en us-east-1
# =============================================================================
set -euo pipefail

PROFILE=${1:-devGreipCompany}
REGION=${2:-us-east-1}
BUCKET_SUFFIX=${3:-dev}
DOMAIN=${4:-appdev.greip.com.pe}
ENVIRONMENT=${ENVIRONMENT:-DEV}

case "${ENVIRONMENT}" in
  DEV|QA|PROD) ;;
  *) echo "ERROR: ENVIRONMENT no soportado: ${ENVIRONMENT} (DEV|QA|PROD)" >&2; exit 1 ;;
esac

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

stack_name() {
  if [ "${ENVIRONMENT}" = "DEV" ]; then
    echo "greip-frontend"
  else
    echo "greip-frontend-${ENVIRONMENT}"
  fi
}

# ── 1. Certificado ACM ──────────────────────────────────────────
CERT_ARN="${CERT_ARN:-}"
CNAME_RECORD_NAME=""
CNAME_RECORD_VALUE=""

if [ -z "${CERT_ARN}" ]; then
  EXISTING_ARN=$(aws acm list-certificates \
    --region ${REGION} --profile ${PROFILE} \
    --query "CertificateSummaryList[?DomainName=='${DOMAIN}' && Status!='FAILED'].CertificateArn" \
    --output text 2>/dev/null || echo "")

  if [ -n "${EXISTING_ARN}" ] && [ "${EXISTING_ARN}" != "None" ]; then
    echo "[cert] Certificado existente: ${EXISTING_ARN}"
    CERT_ARN="${EXISTING_ARN}"
  else
    echo "[cert] Solicitando certificado ACM para ${DOMAIN} ..."
    CERT_ARN=$(aws acm request-certificate \
      --domain-name "${DOMAIN}" \
      --validation-method DNS \
      --region ${REGION} --profile ${PROFILE} \
      --query CertificateArn --output text)
    echo "[cert] ARN: ${CERT_ARN}"
  fi
fi

# ── 2. Esperar la validacion DNS ───────────────────────────────
STATUS=$(aws acm describe-certificate \
  --certificate-arn "${CERT_ARN}" \
  --region ${REGION} --profile ${PROFILE} \
  --query "Certificate.Status" --output text 2>/dev/null || echo "PENDING_VALIDATION")

if [ "${STATUS}" = "PENDING_VALIDATION" ]; then
  echo ""
  echo "[dns] El certificado requiere validacion DNS."
  echo "[dns] Obteniendo registros de validacion ..."

  VALIDATION=$(aws acm describe-certificate \
    --certificate-arn "${CERT_ARN}" \
    --region ${REGION} --profile ${PROFILE} \
    --query "Certificate.DomainValidationOptions[0].ResourceRecord" \
    --output json 2>/dev/null || echo "")

  if [ -n "${VALIDATION}" ] && [ "${VALIDATION}" != "null" ]; then
    CNAME_RECORD_NAME=$(echo "${VALIDATION}" | python3 -c "import sys,json; print(json.load(sys.stdin)['Name'])" 2>/dev/null || echo "")
    CNAME_RECORD_VALUE=$(echo "${VALIDATION}" | python3 -c "import sys,json; print(json.load(sys.stdin)['Value'])" 2>/dev/null || echo "")
  fi

  if [ -z "${CNAME_RECORD_NAME}" ]; then
    echo "[dns] No se pudo obtener el registro de validacion."
    echo "[dns] Revisa la consola ACM > Certificates > ${DOMAIN} > Domains."
    echo ""
    echo "  aws acm describe-certificate --certificate-arn ${CERT_ARN} --region ${REGION} --profile ${PROFILE}"
  else
    echo ""
    echo "=============================================="
    echo "  AGREGAR ESTE REGISTRO EN CLOUDFLARE AHORA"
    echo "=============================================="
    echo "  Type:    CNAME"
    echo "  Name:    ${CNAME_RECORD_NAME}"
    echo "  Value:   ${CNAME_RECORD_VALUE}"
    echo "  Proxy:   DNS only (nube gris)"
    echo "=============================================="
    echo ""
  fi

  echo "[dns] Esperando validacion del certificado (puede tardar unos minutos)..."
  echo "[dns] Presiona ENTER cuando hayas agregado el registro en Cloudflare."
  read -r

  # Esperar la validacion (max ~5 min)
  for i in $(seq 1 30); do
    sleep 10
    STATUS=$(aws acm describe-certificate \
      --certificate-arn "${CERT_ARN}" \
      --region ${REGION} --profile ${PROFILE} \
      --query "Certificate.Status" --output text 2>/dev/null || echo "PENDING_VALIDATION")
    echo "[dns] Intento ${i}: ${STATUS}"
    if [ "${STATUS}" = "ISSUED" ]; then
      echo "[dns] Certificado validado."
      break
    fi
  done

  if [ "${STATUS}" != "ISSUED" ]; then
    echo "[dns] ATENCION: El certificado sigue en estado ${STATUS}."
    echo "[dns] Verifica que el CNAME se haya propagado (dig ${CNAME_RECORD_NAME} CNAME @1.1.1.1)."
    echo "[dns] Vuelve a ejecutar el script cuando el cert este ISSUED."
    exit 1
  fi
else
  echo "[cert] Estado: ${STATUS}"
fi

# ── 3. Desplegar CloudFormation ─────────────────────────────────
echo ""
echo "[cfn] Desplegando stack $(stack_name) (region: ${REGION}) ..."

aws cloudformation deploy \
  --stack-name "$(stack_name)" \
  --template-file "${DIR}/frontend.yml" \
  --parameter-overrides \
    "Environment=${ENVIRONMENT}" \
    "BucketSuffix=${BUCKET_SUFFIX}" \
    "DomainName=${DOMAIN}" \
    "CertificateArn=${CERT_ARN}" \
  --region ${REGION} \
  --profile ${PROFILE} \
  --capabilities CAPABILITY_IAM

# ── 4. Mostrar outputs ──────────────────────────────────────────
echo ""
echo "=============================================="
echo "  Stack $(stack_name) desplegado"
echo "=============================================="

CF_DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name "$(stack_name)" \
  --region ${REGION} --profile ${PROFILE} \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomain'].OutputValue" \
  --output text 2>/dev/null || echo "???")

BUCKET=$(aws cloudformation describe-stacks \
  --stack-name "$(stack_name)" \
  --region ${REGION} --profile ${PROFILE} \
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
  --output text 2>/dev/null || echo "???")

DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name "$(stack_name)" \
  --region ${REGION} --profile ${PROFILE} \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
  --output text 2>/dev/null || echo "???")

echo ""
echo "Bucket S3:                     ${BUCKET}"
echo "CloudFront domain:             ${CF_DOMAIN}"
echo "CloudFront distribution ID:    ${DIST_ID}"
echo ""

if [ -n "${CF_DOMAIN}" ] && [ "${CF_DOMAIN}" != "???" ]; then
  echo "=============================================="
  echo "  AGREGAR ESTE REGISTRO EN CLOUDFLARE"
  echo "=============================================="
  echo "  Type:    CNAME"
  echo "  Name:    ${DOMAIN}"
  echo "  Value:   ${CF_DOMAIN}"
  echo "  Proxy:   DNS only (nube gris)"
  echo "=============================================="
  echo ""
fi

echo "Frontend URL:                  https://${DOMAIN}"
echo ""
echo "Para desplegar el frontend, ejecuta:"
echo "  cd ../../../greip-app-web-react && bash scripts/deploy.sh ${PROFILE} ${BUCKET} ${DIST_ID}"
echo ""
echo "=============================================="
