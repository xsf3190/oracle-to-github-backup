# oracle-to-github-backup
Backup Oracle schemas and Apex applications to Github

Automatic backup of selected ORACLE object definitions and data to a designated GITHUB repository.

Designed to backup relatively small data sets built on the Oracle OCI platform, e.g. "always free".

Individual file exports should not exceed Github recommendation of 50MB. 

## Pre-requisites
1. Obtain GITHUB Personal access token (classic) - https://github.com/settings/tokens

## Use
Generates and transfers the following objects to a designated Github repository:
1. Two datapump exports of the current schema - one including table rows (encrypted) and one with metadata only (not encrypted)
2. Apex application export files including static javascript and css files
3. DDL of TABLE and PACKAGE schema objects (for quick reference)

## Install

1. IMPORT?
1. GRANT READ,WRITE ON DIRECTORY DATA_PUMP_DIR TO "schema"
2. GRANT EXECUTE ON DBMS_CLOUD TO "schema"

## Run (as "schema")
BEGIN 
  pck_backup.github_backup; 
END;

Documentation included in source code - PACKAGE.PCK_BACKUP
