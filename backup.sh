#!/bin/sh
rm -f /sdcard/user.zip
zip -rq9 /sdcard/user.zip /data/data/com.facebook.katana/*
zip -rq9 /sdcard/user.zip /sdcard/Android/data/com.facebook.katana/*



unzip -o /sdcard/user.zip -d /
