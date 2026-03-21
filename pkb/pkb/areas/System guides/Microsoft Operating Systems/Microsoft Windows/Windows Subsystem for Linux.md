
# WSL.exe Usage

# Check version and status

```js
PS C: /> wsl --status
```

# Install Distros

```js
wsl --install -d Ubuntu
wsl --install --distribution Debian
```


# Open WSL instance from Powershell

```js
PS C:\> wls -d "Debian"
```


# Mount Windows Network Drives in WSL

```js
$ sudo mkdir /mnt/"Drive Letter or Folder Name"       # Create the mount point
$ sudo mount -t drvfs "X:" /mnt/"mount point"
```


# Mount Windows Network Shares in WSL

```js
$ sudo mkdir /mnt/"Drive Letter or Folder Name"       # Create the mount point
$ sudo mount -t drvfs '\\ads\profiles$\Jeremy.Ingalls' /mnt/profile
```

# Mount Windows Network Shares in WSL

```js
sudo mount -t drvfs "J:" /mnt/Apps
sudo mount -t drvfs '\\ads\profiles$\Jeremy.Ingalls' /home/localadmin/profile
```
