
DECLARE
    DUMPFILE CONSTANT VARCHAR2(50):='&1';
    l_repo CLOB;
    l_schema VARCHAR2(30);
    pos1 PLS_INTEGER;
    pos2 PLS_INTEGER;
    l_password VARCHAR2(30);
    l_log_filename VARCHAR2(30);
    l_status ku$_Status;
    l_job_state VARCHAR2(50);
    l_handle NUMBER;
    l_log_blob BLOB;
    l_log_clob CLOB;
    l_grants CLOB;
    l_statements apex_t_varchar2;
    l_statement VARCHAR2(4000);
    object_not_found EXCEPTION;
    PRAGMA EXCEPTION_INIT(object_not_found, -4042);
BEGIN
    dbms_output.put_line('Importing Github file ' || DUMPFILE || ' from repository xsf3190/oracle-to-github-backup');
    /* Connect to target Github repository */
    l_repo := dbms_cloud_repo.init_github_repo(
        credential_name => 'GITHUB_CRED',
        repo_name       => 'oracle-to-github-backup',
        owner           => 'xsf3190'
    );

    /* Copy export dump file to DATA_PUMP_DIR */
    l_log_filename:=REPLACE(REPLACE(DUMPFILE,'dmp','log'),'EXPORT','IMPORT');
    dbms_cloud_repo.get_file(
        repo             =>  l_repo,
        file_path        => DUMPFILE,
        directory_name   => 'DATA_PUMP_DIR',
        target_file_name => DUMPFILE
    );

    /* schema name is second part of dump file name */
    pos1:=INSTR(DUMPFILE,'.',1,1);
    pos2:=INSTR(DUMPFILE,'.',1,2)-1;
    l_schema:=SUBSTR(DUMPFILE,pos1+1,pos2-pos1);

    /* Re-create schema always */
    dbms_output.put_line('Importing schema ' || l_schema);
    EXECUTE IMMEDIATE 'DROP USER IF EXISTS ' || l_schema || ' CASCADE';
    EXECUTE IMMEDIATE 'CREATE USER ' || l_schema || ' QUOTA UNLIMITED ON DATA';

    /* Get object grants from repo and apply before import */
    l_grants:=dbms_cloud_repo.get_file(repo=>l_repo,file_path=>'GRANT.OBJECT_GRANT');
    l_statements:=apex_string.split(l_grants,';');
    FOR i IN 1..l_statements.COUNT LOOP
        l_statement:=REPLACE(l_statements(i),chr(10)||chr(32)||chr(32));
        IF (l_statement IS NOT NULL) THEN
            BEGIN
                EXECUTE IMMEDIATE l_statement;
                EXCEPTION WHEN object_not_found THEN NULL;
            END;
        END IF;
    END LOOP;

    /* Get dump file encryption password from source database */
    EXECUTE IMMEDIATE 'SELECT export_pw FROM ' || l_schema || '.users@restore_link WHERE export_pw IS NOT NULL' INTO l_password;

    /* Do the import */
    dbms_output.put_line('Starting import');
    l_handle := dbms_datapump.open(operation => 'IMPORT', job_mode => 'SCHEMA', job_name => 'SCHEMA_IMPORT', version => 'LATEST');
    dbms_datapump.metadata_filter(handle => l_handle, name => 'SCHEMA_EXPR', value => 'IN(''' || l_schema || ''')'); 
    dbms_datapump.add_file(handle => l_handle, filename => DUMPFILE, directory => 'DATA_PUMP_DIR', filetype => DBMS_DATAPUMP.KU$_FILE_TYPE_DUMP_FILE); 
    dbms_datapump.add_file(handle => l_handle, filename => l_log_filename, directory => 'DATA_PUMP_DIR', filetype => DBMS_DATAPUMP.KU$_FILE_TYPE_LOG_FILE, reusefile => 1); 
    dbms_datapump.set_parameter(handle => l_handle, name => 'ENCRYPTION_PASSWORD', value => l_password); 
    dbms_datapump.set_parameter(handle => l_handle, name => 'LOGTIME', value => 'ALL'); 
    dbms_datapump.set_parameter(handle => l_handle, name => 'KEEP_MASTER', VALUE => 0); 
    dbms_datapump.start_job(handle => l_handle); 
    dbms_datapump.wait_for_job( handle => l_handle, job_state => l_job_state);
    dbms_datapump.detach(handle => l_handle);
    dbms_output.put_line('Ended import - ' || l_job_state);

    /* Settle down before fetching import log file */
    dbms_session.sleep(5);

    /* Print import schema log file */
    l_log_blob:=TO_BLOB(BFILENAME('DATA_PUMP_DIR',l_log_filename));
    l_log_clob:=apex_util.blob_to_clob(l_log_blob);
    dbms_output.put_line(l_log_clob);
END;
/