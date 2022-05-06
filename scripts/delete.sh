avatar=avatar_default.png
pics=public/pictures
mv $pics/$avatar /tmp/
rm -r $pics
mkdir $pics
mv /tmp/$avatar $pics/
rm -r logs

docker-compose down -v --rmi local
