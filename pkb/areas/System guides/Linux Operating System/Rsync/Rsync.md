
```
rsync -avPW -e 'ssh' --ignore-existing Plex localadmin@fs1:/cots/glusterfs/Library /home/st31945/domains/ds.9xc.io/storage

# remote IP: 67.217.57.194
# remote user: st35787
# remote folder: /home/st35787/domains/9xc/Plex


rsync -avPW -e 'ssh' --ignore-existing st35787@67.217.57.194:/home/st35787/domains/9xc/Plex/Library /export/media


rsync -avWP --ignore-existing --stats TV_Series/ /media/Library/TV_Series
```