@echo off

rmdir /s /q data
rmdir /s /q logs

docker-compose down -v --rmi local
