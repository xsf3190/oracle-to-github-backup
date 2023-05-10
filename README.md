# oracle-to-github-backup
Automatic backup of selected ORACLE objects to a designated GITHUB repository.

Designed to backup relatively small data sets built on the Oracle OCI platform, e.g. "Always Free".

Optional restore from Github into a target database identified by DB LINK.

Individual file exports should not exceed Github recommendation of 50MB. 

## Pre-requisites
1. Obtain GITHUB Personal access token (classic) - https://github.com/settings/tokens
2. For automated restore create DB LINK to a target ADB database

## Use
Generates and transfers the following objects to a Github repository:
1. Datapump export encrypted of the current schema including table rows
2. Datapump export unencrypted of the current schema with metadata only
3. Object and System Grants
4. Apex application export files including static javascript and css files
5. ORDS metadata
6. DDL of TABLE and PACKAGE schema objects (for quick reference)

## Install
1. GRANT READ,WRITE ON DIRECTORY DATA_PUMP_DIR TO "schema"
2. GRANT EXECUTE ON DBMS_CLOUD TO "schema"
3. Download contents of TABLE.LOG, PACKAGE.PCK_BACKUP and create in "schema"

## Run
```
DECLARE
  l_password VARCHAR2(20);
  l_restore_files LONG;                
BEGIN 
  pck_backup.github_backup(
        p_github_token =>'xxxx',           /* GITHUB Personal access token */
        p_github_repos_owner => 'xxx',     /* GITHUB repository owner */
        p_github_repos => 'xxxxx',         /* GITHUB repository path */
        p_email => 'name@domain.com',      /* Email address to receive status message */
        p_password => 'Ab1!etcetc',        /* password for encrypting schema export dump file */
        p_restore_files => l_restore_files /* IN OUT parameter returns colon-separated list of GITHUB files to restore */
  );
END;
```
