# oracle-to-github-backup
This repository contains code and data that is backed up daily from the ORACLE database that is the central component of the adfreesites web application.

Data is backed up as a schema export dump file encrypted with a randomly generated complex password sent by email to the adfreesites administrator.
A metadata only version is created at the same time that could be used for a new deployment for example.

Includes DDL metadata extracts of tables and packages for quick reference.

Includes any APEX applications and static Javascript / CSS files.

Includes any ORDS REST schema.

## Pre-requisites
1. Obtain GITHUB Personal access token (classic) - https://github.com/settings/tokens
2. Configure email for OCI tenancy - https://blogs.oracle.com/apex/post/sending-email-from-your-oracle-apex-app-on-autonomous-database

## Ideas for Use
1. Include in Terraform process triggered by Github Action to create new instance of adfreesites web application.
2. Make current and historical code available for easy review / sharing.
3. Provide a secure and reliable off-site backup solution. 
4. Implement an automated backup / restore cycle between 2 Oracle databases.
5. Deploy an environment in order to test new Oracle software versions.
6. Run fully scripted migrations between different platforms.

Github supports maximum file size of 100MB. However, Oracle dump files are compressed by an order of magnitude with the Advanced Compression option. E.g. 170 MB compresses to 25 MB.

N.b. "Always Free" Oracle OCI includes use of options like 'Advanced Compression".

## Install
Logged on to the subject database as ADMIN
1. GRANT READ,WRITE ON DIRECTORY DATA_PUMP_DIR TO "schema-to-backup"
2. GRANT EXECUTE ON DBMS_CLOUD TO "schema-to-backup"
3. Download contents of TABLE.LOG and PACKAGE.PCK_BACKUP from this repository and create in "schema-to-backup"

Adapt the packages to suit any specific requirements.

## Run
In a session connected to "schema-to-backup"
```
/*
** Run a one-off export to GITHUB repository, sending status to specified email address
*/
DECLARE
  l_github_token       VARCHAR2(40):='YOUR GITHUB TOKEN'; 
  l_github_repos_owner VARCHAR2(40):='YOUR GITHUB ACCOUNT NAME';
  l_github_repos       VARCHAR2(40):='YOUR GITHUB REPOSITORY';
  l_email              VARCHAR2(40):='EMAIL ADDRESS TO RECEIVE JOB LOG';  
  l_password           VARCHAR2(20):='PASSWORD';
BEGIN 
  pck_backup.github_backup(
        p_github_token => l_github_token,
        p_github_repos_owner => l_github_repos_owner,
        p_github_repos => l_github_repos,
        p_email => l_email,
        p_password => l_password
  );
END;
```
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
Where "pck_backup.daily_backup" is a package procedure that prepares and calls "pck_backup.github_backup" passing an auto-generated complex password
