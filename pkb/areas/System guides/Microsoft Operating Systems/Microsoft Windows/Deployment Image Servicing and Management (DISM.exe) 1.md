
# Website for using DISM:
```js
https://gist.github.com/ritchiecarroll/6def10ed017d8cd4b7b00daffeccfa13
```


# Mounting the image:
```js
DISM /Mount-Image /ImageFile:"F:\transfer\IS10-Workstation\IS10.VHDX" /Index:1 /MountDir:F:\transfer\Mount\ /ScratchDir:F:\transfer\Temp /LogPath:F:\transfer\Temp\dism-mount-log.txt
```


# Capture VHDX to Windows Image File (WiM):

```js
DISM /Capture-Image /ImageFile:F:\transfer\Capture\IS10.wim /CaptureDir:F:\transfer\Mount /Name:IS10-Workstation /Description:"IS10 Workstation" /Compress:none /Verify /ScratchDir:F:\transfer\Temp /LogPath:F:\transfer\Temp\dism-capture-log.txt
```

