# oracle-to-github-backup
Automatic backup of selected objects from ORACLE OCI ADB to a designated GITHUB repository.

Creates files on GITHUB including encrypted schema export dump files, Apex application exports, ORDS metadata, TABLE and PACKAGE definitions.

Optional restore from Github into a target ADB identified by DB LINK.

Individual file exports should not exceed Github recommendation of 50MB. 

## Pre-requisites
1. Obtain GITHUB Personal access token (classic) - https://github.com/settings/tokens
2. For automated status emails configure OCI email - https://blogs.oracle.com/apex/post/sending-email-from-your-oracle-apex-app-on-autonomous-database
3. For automated restore from GITHUB create DB LINK to a target ADB database

## Use
Make Oracle data and definitions available for sharing through private or public GITHUB repositories.

Implement an automated backup / restore cycle between 2 ADB instances to provision a complete recovery or testing environment.

This repository contains files generated for a daily backup / restore of a schema called EXAMPLE between 2 ADBs in an ORACLE OCI "Always Free" tenancy:
1. hl7offzwezq2cal-db202103270929
2. hl7offzwezq2cal-restoretestdb1

The configurable part of the ADB names are included in each GITHUB commit message. 

All files are regenerated daily and sent to GITHUB - the last update time shows when the file content was last changed. 

## Install
1. GRANT READ,WRITE ON DIRECTORY DATA_PUMP_DIR TO "schema-to-backup"
2. GRANT EXECUTE ON DBMS_CLOUD TO "schema-to-backup"
3. Download contents of TABLE.LOG and PACKAGE.PCK_BACKUP and create in "schema-to-backup"

For restore option:
1. download contents of TABLE.LOG and PACKAGE.PCK_RESTORE and create in ADMIN schema in target ADB
2. create credential for target ADB ADMIN user in "schema-to-backup"
3. create db link to target ADB ADMIN user in "schema-to-backup"

## Run
```
/*
** Run a one-off export to GITHUB repository, sending status to specified email address
*/
DECLARE
  l_github_token       VARCHAR2(40):='YOUR TOKEN'; 
  l_github_repos_owner VARCHAR2(40):='YOUR GITHUB ACCOUNT NAME';
  l_github_repos       VARCHAR2(40):='YOUR GITHUB REPOSITORY';
  l_email              VARCHAR2(40):='YOUR EMAIL ADDRESS';  
  l_password           VARCHAR2(20):='COMPLEX PASSWORD';
  l_workspace_name     VARCHAR2(40):='YOUR TARGET ADB WORKSPACE';
  l_restore_files LONG;                
BEGIN 
  pck_backup.github_backup(
        p_github_token => l_github_token,
        p_github_repos_owner => l_github_repos_owner,
        p_github_repos => l_github_repos,
        p_email => l_email,
        p_password => l_password,
        p_restore_files => l_restore_files
  );
  /* 
  ** Uncomment to run restore on target ADB 
  */
  /*
  EXECUTE IMMEDIATE q'{
        BEGIN pck_restore.submit_job@RESTORE_LINK(  /* RESTORE_LINK directs to ADMIN user in target ADB */
            pGithub_files=>:B1, 
            pGithub_token=>:B2, 
            pGithub_repos_owner=>:B3, 
            pGithub_repos=>:B4,
            pPassword=>:B5,
            pEmail=>:B6,
            pWorkspace=>:B7,
            pSchema=>:B8); 
        END;}' 
        USING l_restore_files, l_github_token, l_github_repos_owner, l_github_repos, l_password, l_email, l_workspace_name, sys_context('userenv','current_schema');
  */
END;
```
Typically, you would call the backup procedure through a scheduled dbms_scheduler job, passing parameters from an application table.

Adapt package PACKAGE.PCK_BACKUP to suit specific requirements - in particular the selection of which objects to export.

Export and import activities are logged in table LOG on both of the ADB instances along with any errors.

Data pump log files from the last run are also stored in the repository - i.e. EXPORT_SCHEMA.EXAMPLE.log and IMPORT_SCHEMA.EXAMPLE.log

GITHUB commit messages include the ADB database name that issued the upload to the repository.
