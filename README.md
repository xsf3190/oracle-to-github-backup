# oracle-to-github-backup
Automatic backup of selected ORACLE objects to a designated GITHUB repository.

Designed to backup relatively small data sets built on the Oracle OCI platform, e.g. "Always Free".

Optional restore from Github into a target database identified by DB LINK.

Individual file exports should not exceed Github recommendation of 50MB. 

## Pre-requisites
1. Obtain GITHUB Personal access token (classic) - https://github.com/settings/tokens
2. For automated restore create DB LINK to a target ADB database

## Use
Generates and transfers the following objects as files to a Github repository:
1. Datapump export encrypted of the current schema including table rows
2. Datapump export unencrypted of the current schema with metadata only
3. Object and System Grants
4. Apex application export files including static javascript and css files
5. ORDS metadata
6. DDL of TABLE and PACKAGE schema objects (for quick reference)

## Install
1. GRANT READ,WRITE ON DIRECTORY DATA_PUMP_DIR TO "schema"
2. GRANT EXECUTE ON DBMS_CLOUD TO "schema"
3. Download contents of TABLE.LOG and PACKAGE.PCK_BACKUP and create in "schema"

For restore option:
1. download contents of TABLE.LOG and PACKAGE.PCK_RESTORE and create in ADMIN schema in target ADB
2. create credential for ADMIN user in "schema"
3. create db link to ADMIN user in "schema"

## Run
```
DECLARE
  l_github_token VARCHAR2(40); 
  l_github_repos_owner VARCHAR2(40);
  l_github_repos VARCHAR2(40);
  l_email VARCHAR2(40);
  l_password VARCHAR2(20);
  l_github_filename VARCHAR2(100);
  l_workspace_name apex_workspace_developers.workspace_name%type;
  l_restore_files LONG;                
BEGIN 
  pck_backup.github_backup(
        p_github_token => l_github_token,           /* GITHUB Personal access token */
        p_github_repos_owner => l_github_repos_owner,     /* GITHUB repository owner */
        p_github_repos => l_github_repos,         /* GITHUB repository path */
        p_email => l_email,      /* Email address to receive status message */
        p_password => 'l_password,        /* password for encrypting schema export dump file */
        p_restore_files => l_restore_files /* IN OUT parameter returns colon-separated list of GITHUB files to restore */
  );
  /* Run restore */
  EXECUTE IMMEDIATE q'{
            BEGIN pck_restore.submit_job@RESTORE_LINK(
                pGithub_files=>:B1, 
                pGithub_token=>:B2, 
                pGithub_repos_owner=>:B3, 
                pGithub_repos=>:B4,
                pPassword=>:B5,
                pEmail=>:B6,
                pWorkspace=>:B7); END;}' 
          USING l_restore_files, l_github_token, l_github_repos_owner, l_github_repos, l_password, l_email, l_workspace_name;
END;
```
