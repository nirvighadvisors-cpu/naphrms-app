$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm run dev
