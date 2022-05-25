@echo off
SET env_file=.env
IF EXIST %env_file% DEL %env_file%

powershell.exe start powershell.exe -ArgumentList '-command "Set-Location %cd%; New-Item -ItemType SymbolicLink -Path %env_file% -Target ..\project-olive-main\%env_file%"' -Verb runAs
