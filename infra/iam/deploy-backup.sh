#!/bin/bash
# Despliega el rol de backup del EC2 PostgreSQL de GREIP COMPANY.
# DEV usa el stack legacy 'greip-iam-backup'; QA/PROD usan 'greip-iam-backup-<ENV>'.
#
# Uso: ENVIRONMENT=DEV|QA|PROD bash deploy-backup.sh [profile] [region]
set -euo pipefail

PROFILE=${1:-devGreipCompany}
REGION=${2:-us-east-2}
ENVIRONMENT=${ENVIRONMENT:-DEV}
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "${ENVIRONMENT}" in
  DEV|QA|PROD) ;;
  *) echo "ERROR: ENVIRONMENT no soportado: ${ENVIRONMENT} (DEV|QA|PROD)" >&2; exit 1 ;;
esac

case "${ENVIRONMENT}" in
  DEV)  BUCKET_SUFFIX=dev ;;
  QA)   BUCKET_SUFFIX=qa ;;
  PROD) BUCKET_SUFFIX=prod ;;
esac

STACK_NAME="greip-iam-backup"
if [ "${ENVIRONMENT}" != "DEV" ]; then
  STACK_NAME="greip-iam-backup-${ENVIRONMENT}"
fi

echo "==> Stack ${STACK_NAME} | Environment=${ENVIRONMENT} | BucketSuffix=${BUCKET_SUFFIX}"
aws cloudformation deploy \
  --stack-name "${STACK_NAME}" \
  --template-file "${DIR}/ec2-backup-role.yml" \
  --parameter-overrides Environment=${ENVIRONMENT} BucketSuffix=${BUCKET_SUFFIX} \
  --region ${REGION} --profile ${PROFILE} \
  --capabilities CAPABILITY_NAMED_IAM

aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region ${REGION} --profile ${PROFILE} \
  --query 'Stacks[0].Outputs[]' --output table
