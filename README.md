# oracle-to-github-backup
This repository contains data backed up daily from an ORACLE "Always Free" OCI database.

The backup is a compressed schema export dump file encrypted with a randomly generated complex password.

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
1. Provide a secure and reliable off-site backup solution. 
2. Make current and historical code available for easy reference / sharing.
3. Provide an automatic backup / restore cycle betweeen 2 databases.
4. Deploy an environment to test a new Oracle software release.

Although Github supports a maximum file size of 100MB, the Advanced Compression option reduces dump file size by an order of magnitude (up to 10 times).

## Install
Logged on to the subject database as ADMIN
1. GRANT READ,WRITE ON DIRECTORY DATA_PUMP_DIR TO "schema-to-backup"
2. GRANT EXECUTE ON DBMS_CLOUD TO "schema-to-backup"
3. GRANT EXECUTE ON DBMS_CLOUD_REPO TO "schema-to-backup"
4. Compile PACKAGE.PCK_BACKUP from this repository in "schema-to-backup"

This package implements the actual backup process for my EXAMPLE application schema which includes:
1. Logging process steps in a schema table
2. Emailing backup result to application-specific "admin" users

Adapt the package, therefore, to suit specific requirements.

## Run
For example, to schedule every day at 9PM
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

## Restore
Backing up is pointless unless the data backed up on ADB1 can be reliably restored in ADB2.

The repository includes the "import_schema.sql" script which runs on the second ADB database in my OCI "Always Free" tenancy.

The script runs daily on a Linux Compute instance recreating the schema from the Github export schema dump file.

The main issue here is how to securely serve the encryption password that was used to create the daily dump file.

The simplistic approach I adopted:
1. Store the randomly generated encryption password in an application schema table for "admin" users on ADB1
2. Create database link in ADB2 pointing to the ADMIN user in ADB1
3. The "import_schema.sql" script retrieves the password using the database link

If anyone has a better idea, I would be delighted to hear it.
