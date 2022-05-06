@echo off

set avatar=avatar_default.png
set pics=public\pictures
move %pics%\%avatar% %TEMP%
rmdir /s /q %pics%
mkdir %pics%
move %TEMP%\%avatar% %pics%
rmdir /s /q logs

docker-compose down -v --rmi local
