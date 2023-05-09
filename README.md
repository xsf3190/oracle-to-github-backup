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
1. IMPORT?
1. GRANT READ,WRITE ON DIRECTORY DATA_PUMP_DIR TO "schema"
2. GRANT EXECUTE ON DBMS_CLOUD TO "schema"

## Run (as "schema")
BEGIN 
  pck_backup.github_backup; 
END;

Documentation included in source code - PACKAGE.PCK_BACKUP
