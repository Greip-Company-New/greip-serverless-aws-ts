# service-canales

Microservicio de canales de GREIP COMPANY (usuarios, archivos) sobre **DynamoDB + S3**.

Estado: **scaffold pendiente** — se creará al construir la fase de infraestructura (DynamoDB, S3) siguiendo el patrón del arquetipo:

```
serverless.yml            # build:false, plugins (domain-manager, offline), apiKeys + usagePlan, vpc, tracing, tags
serverless-config.yml     # DEV: region us-east-2, profile devGreipCompany, subnets/SG, lyCommonNew
functions.yml             # lambdas usuario-* / archivo-* con http events private:true
config/serverless/        # http-cors.yml, http-response.yml, resources.yml, *.vm
src/usuario-lmb/          # app.ts, controller.ts, service.ts, repository.ts, validate.ts, models.ts, constants.ts
src/archivo-lmb/          # DynamoDBService + S3Service de ly-nodejs-ts-common
```

Ver `../README.md` para la integración de la capa `ly-nodejs-ts-common`.
