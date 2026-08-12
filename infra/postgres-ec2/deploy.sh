#!/bin/bash
# Despliega el EC2 con PostgreSQL 16 de GREIP COMPANY y guarda credenciales en SSM.
# Requiere: stack del VPC desplegado (greip-vpc para DEV, greip-vpc-<STAGE> para QA/PROD).
#
# Uso: ENVIRONMENT=DEV|QA|PROD bash deploy.sh [profile] [region] [OFFICE_IP ignorado, compatibilidad] [KEY_NAME opcional]
set -euo pipefail

PROFILE=${1:-devGreipCompany}
REGION=${2:-us-east-2}
OFFICE_IP=${3:-}
KEY_NAME=${4:-}
INSTANCE_TYPE=t3.micro
STAGE=${ENVIRONMENT:-DEV}

case "${STAGE}" in
  DEV|QA|PROD) ;;
  *) echo "ERROR: ENVIRONMENT/STAGE no soportado: ${STAGE} (DEV|QA|PROD)" >&2; exit 1 ;;
esac

STACK_VPC="greip-vpc"
if [ "${STAGE}" != "DEV" ]; then
  STACK_VPC="greip-vpc-${STAGE}"
fi

SECRET_NAME="Greip/postgres/${STAGE}"

echo "==> Perfil: ${PROFILE} | Region: ${REGION} | Stage: ${STAGE}"
echo "==> Nota: el SG (5432/22) lo gestiona infra/vpc (OfficeIp o OpenToInternet=true)"

echo "==> Obteniendo IDs del stack ${STACK_VPC}"
SUBNET=$(aws cloudformation describe-stacks --stack-name ${STACK_VPC} --region ${REGION} --profile ${PROFILE} \
  --query "Stacks[0].Outputs[?OutputKey=='PublicSubnetId'].OutputValue" --output text)
SG=$(aws cloudformation describe-stacks --stack-name ${STACK_VPC} --region ${REGION} --profile ${PROFILE} \
  --query "Stacks[0].Outputs[?OutputKey=='PostgresSecurityGroupId'].OutputValue" --output text)
VPC_ID=$(aws cloudformation describe-stacks --stack-name ${STACK_VPC} --region ${REGION} --profile ${PROFILE} \
  --query "Stacks[0].Outputs[?OutputKey=='VpcId'].OutputValue" --output text)

if [ -z "${SUBNET}" ] || [ -z "${SG}" ]; then
  echo "ERROR: no se encontraron outputs del stack ${STACK_VPC}. Despliega primero infra/vpc." >&2
  exit 1
fi

echo "==> AMI de Amazon Linux 2023 (us-east-2)"
AMI=$(aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64 \
  --region ${REGION} --profile ${PROFILE} --query 'Parameter.Value' --output text)

DB_USER=greip_app
DB_NAME=greipdb
DB_PASS=$(openssl rand -base64 18 | tr -d '/+=' | head -c 24)

echo "==> Generando user-data con credenciales"
sed -e "s/__DB_PASS__/${DB_PASS}/" "$(dirname "$0")/user-data.sh" > /tmp/greip-user-data.sh

KEY_ARGS=()
if [ -n "${KEY_NAME}" ]; then
  KEY_ARGS=(--key-name "${KEY_NAME}")
fi

echo "==> Lanzando instancia EC2 (${INSTANCE_TYPE}) en subred publica"
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "${AMI}" \
  --instance-type "${INSTANCE_TYPE}" \
  --subnet-id "${SUBNET}" \
  --security-group-ids "${SG}" \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":20,"VolumeType":"gp3","DeleteOnTermination":true}}]' \
  --user-data "file:///tmp/greip-user-data.sh" \
  --tag-specifications "[{\"ResourceType\":\"instance\",\"Tags\":[{\"Key\":\"Name\",\"Value\":\"GREIP-POSTGRES-${STAGE}\"},{\"Key\":\"OWNER\",\"Value\":\"GREIP-COMPANY\"},{\"Key\":\"STAGE\",\"Value\":\"${STAGE}\"}]}]" \
  --profile ${PROFILE} --region ${REGION} \
  ${KEY_ARGS[@]+"${KEY_ARGS[@]}"} \
  --query 'Instances[0].InstanceId' --output text)
echo "==> Instancia creada: ${INSTANCE_ID}"

echo "==> Esperando estado running..."
aws ec2 wait instance-running --instance-ids "${INSTANCE_ID}" --region ${REGION} --profile ${PROFILE}

PRIVATE_IP=$(aws ec2 describe-instances --instance-ids "${INSTANCE_ID}" --region ${REGION} --profile ${PROFILE} \
  --query 'Reservations[0].Instances[0].PrivateIpAddress' --output text)
PUBLIC_IP=$(aws ec2 describe-instances --instance-ids "${INSTANCE_ID}" --region ${REGION} --profile ${PROFILE} \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
echo "==> IP privada: ${PRIVATE_IP} | IP publica: ${PUBLIC_IP}"

echo "==> Guardando credenciales en Secrets Manager (${SECRET_NAME})"
SECRET_JSON="{\"host\":\"${PRIVATE_IP}\",\"port\":5432,\"db\":\"${DB_NAME}\",\"user\":\"${DB_USER}\",\"pass\":\"${DB_PASS}\"}"
if aws secretsmanager describe-secret --secret-id "${SECRET_NAME}" --region ${REGION} --profile ${PROFILE} >/dev/null 2>&1; then
  # Ya existe (re-despliegue del mismo stage): nueva version del secret
  aws secretsmanager put-secret-value --secret-id "${SECRET_NAME}" \
    --secret-string "${SECRET_JSON}" --region ${REGION} --profile ${PROFILE}
else
  aws secretsmanager create-secret --name "${SECRET_NAME}" \
    --secret-string "${SECRET_JSON}" \
    --tags Key=OWNER,Value=GREIP-COMPANY Key=STAGE,Value=${STAGE} \
    --region ${REGION} --profile ${PROFILE}
fi

rm -f /tmp/greip-user-data.sh

echo ""
echo "=== RESUMEN ==="
echo "InstanceId : ${INSTANCE_ID}"
echo "VpcId      : ${VPC_ID}"
echo "PrivateIp  : ${PRIVATE_IP}"
echo "PublicIp   : ${PUBLIC_IP}"
echo "DB         : ${DB_NAME} (usuario ${DB_USER})"
echo "Secret     : ${SECRET_NAME} (Secrets Manager, JSON {host,port,db,user,pass})"
echo "IMPORTANTE : espera 2-3 min para que termine el user-data (dnf install + setup)."
echo "            Verifica con: ssh ec2-user@${PUBLIC_IP} 'sudo cat /var/log/user-data.log'"
