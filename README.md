# oracle-to-github-backup
This repository contains code and data backed up daily from an ORACLE database schema.

Data is backed up as a compressed export dump file encrypted with a randomly generated complex password.

Includes DDL metadata extracts of tables, packages and grants.

Includes any APEX applications and static Javascript / CSS files.

Includes any ORDS REST schema.

## Pre-requisites
1. Obtain GITHUB Personal access token (classic) - https://github.com/settings/tokens
2. Create credential in "schema-to-backup" referencing the Github account name and token, e.g.

```
begin
  dbms_cloud.create_credential (
    credential_name => 'GITHUB_CRED',
    username        => 'xsf3190',
    password        => '***********'
  ) ;
end;
```
   
## Ideas for Use
1. Include in Terraform process triggered by Github Action to create new instance of adfreesites web application.
2. Make current and historical code available for easy reference / sharing.
3. Provide a secure and reliable off-site backup solution. 
4. Implement an automated backup / restore cycle between 2 Oracle Cloud databases (see "import_schema.sql")
5. Deploy an environment to test new Oracle software versions.
6. Run fully scripted migrations between different platforms.

Github supports a maximum file size of 100MB. However, Oracle dump files are compressed by an order of magnitude with the Advanced Compression option that is
freely available with Oracle OCI Always Free.

The EXAMPLE schema in this repository compresses 22MB into a 2MB dump file.

## Install
Logged on to the subject database as ADMIN
1. GRANT READ,WRITE ON DIRECTORY DATA_PUMP_DIR TO "schema-to-backup"
2. GRANT EXECUTE ON DBMS_CinLOUD TO "schema-to-backup"
3. GRANT EXECUTE ON DBMS_CLOUD_REPO TO "schema-to-backup"
4. Download contents of TABLE.LOG and PACKAGE.PCK_BACKUP from this repository and create in "schema-to-backup"

Adapt the packages to suit any specific requirements.

## Run
To schedule secure regular backups, e.g. every day at 9PM
```
BEGIN
  DBMS_SCHEDULER.create_job (
    job_name=> 'DAILY_BACKUP',
    job_type=> 'PLSQL_BLOCK',
    job_action=> 'begin pck_backup.daily_backup; end;',
    start_date=> systimestamp,
    repeat_interval=> 'FREQ=DAILY; Interval=1;BYHOUR=21;ByMinute=0',
    enabled =>TRUE,
    auto_drop=>FALSE);
end;
/
```
