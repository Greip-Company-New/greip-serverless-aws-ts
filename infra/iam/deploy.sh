#!/bin/bash
# Despliega el IAM Role lambda-vpc-role de GREIP COMPANY.
#
# Uso: bash deploy.sh [profile] [region]
set -euo pipefail

PROFILE=${1:-devGreipCompany}
REGION=${2:-us-east-2}
ENVIRONMENT=${ENVIRONMENT:-DEV}
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

aws cloudformation deploy \
  --stack-name greip-iam \
  --template-file "${DIR}/lambda-vpc-role.yml" \
  --parameter-overrides Environment=${ENVIRONMENT} \
  --region ${REGION} --profile ${PROFILE} \
  --capabilities CAPABILITY_NAMED_IAM

aws cloudformation describe-stacks --stack-name greip-iam --region ${REGION} --profile ${PROFILE} \
  --query 'Stacks[0].Outputs[]' --output table
