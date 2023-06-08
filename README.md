# oracle-to-github-backup
Automatic backup of selected objects from an ORACLE Autonomous database (ADB) to a designated GITHUB repository.

Includes schema export dump and log files, Apex application exports, ORDS metadata, object and system grants, TABLE and PACKAGE definitions.

Schema export dump files containing row data are encrypted with a generated random password.

Optional restore procedure imports schema and Apex applications from GITHUB into a target ADB identified by DB LINK.

ORDS metadata export scripts have to be manually imported as ADB does not support running scripts from PLSQL.

All files in this repository are created/updated by a scheduled Oracle job running daily at 8pm GMT.

## Pre-requisites
1. Obtain GITHUB Personal access token (classic) - https://github.com/settings/tokens
2. Configure email for OCI tenancy - https://blogs.oracle.com/apex/post/sending-email-from-your-oracle-apex-app-on-autonomous-database
3. Create DB LINK to target ADB database for automatic restore

## Use
1. Make Oracle data and definitions available for review / sharing through private or public GITHUB repositories.
2. Provide an off-site backup solution for subscribers to OCI "Always Free". 
3. Implement an automated backup / restore cycle between 2 ADB instances to enable fine-grained point-in-time recovery.
4. Deploy environment to test new Oracle / Apex software versions.
5. Run fully scripted migrations between different platforms (caveat: ORDS metadata).

Should be used for modestly sized schemas (<100MB) although this depends on the nature of data stored.

Note that dump files are compressed by an order of magnitude.

## Install
For backup:
1. GRANT READ,WRITE ON DIRECTORY DATA_PUMP_DIR TO "schema-to-backup"
2. GRANT EXECUTE ON DBMS_CLOUD TO "schema-to-backup"
3. Download contents of TABLE.LOG and PACKAGE.PCK_BACKUP and create in "schema-to-backup"

For restore:
1. download contents of TABLE.LOG and PACKAGE.PCK_RESTORE and create in ADMIN schema in target ADB
2. create credential for target ADB ADMIN user in "schema-to-backup"
3. create db link to target ADB ADMIN user in "schema-to-backup"

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
  ** Uncomment to restore selected GITHUB files to a target ADB
  ** Requires DBLINK in "schema-to-backup" to ADMIN user in target ADB.
  */
  /*
  EXECUTE IMMEDIATE q'{
        BEGIN pck_restore.submit_job@RESTORE_LINK(
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
