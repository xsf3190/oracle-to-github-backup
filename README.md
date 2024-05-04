# oracle-to-github-backup
This repository contains code and data automatically backed up from an ORACLE OCI database, which is the central component of the adfreesites web application.

Data is backed up as a schema export dump file encrypted with a randomly generated complex password that is shared by email with the designated Administrator.
A metadata only version is created at the same time for use in a new deployment for example.

Definitions are DDL metadata extracts of Oracle tables and packages.

## Pre-requisites
1. Obtain GITHUB Personal access token (classic) - https://github.com/settings/tokens
2. Configure email for OCI tenancy - https://blogs.oracle.com/apex/post/sending-email-from-your-oracle-apex-app-on-autonomous-database

## Ideas for Use
1. Make current and historical code available for easy review / sharing.
2. Provide a secure and reliable off-site backup solution. 
3. Implement an automated backup / restore cycle between 2 Oracle OCI ADB instances.
4. Deploy an environment in order to test new Oracle / Apex software versions.
5. Run fully scripted migrations between different platforms.

Github supports maximum file size of 100MB. However, Oracle dump files are compressed by an order of magnitude with the Advanced Compression option. E.g. 170 MB compresses to 25 MB.

N.b. "Always Free" Oracle OCI confers use of options like 'Advanced Compression".

## Install
Logged on to the subject database as ADMIN
1. GRANT READ,WRITE ON DIRECTORY DATA_PUMP_DIR TO "schema-to-backup"
2. GRANT EXECUTE ON DBMS_CLOUD TO "schema-to-backup"
3. Download contents of TABLE.LOG and PACKAGE.PCK_BACKUP from this repository and create in "schema-to-backup"

Adapt the packages to suit any specific requirements.

## Run
```
/*
** Run a one-off export to GITHUB repository, sending status to specified email address
*/
DECLARE
  l_github_token       VARCHAR2(40):='YOUR TOKEN (pre-requisite 1)'; 
  l_github_repos_owner VARCHAR2(40):='YOUR GITHUB ACCOUNT NAME';
  l_github_repos       VARCHAR2(40):='YOUR GITHUB REPOSITORY';
  l_email              VARCHAR2(40):='EMAIL ADDRESS TO RECEIVE LOG AND PASSWORD';  
  l_password           VARCHAR2(20):='COMPLEX AUTO-GENERATED PASSWORD';
  l_workspace_name     VARCHAR2(40):='YOUR TARGET ADB WORKSPACE';
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
