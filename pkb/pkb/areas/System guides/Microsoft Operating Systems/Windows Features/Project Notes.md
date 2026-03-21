# Provide a list of installed features on system

```js

# Get a list of all installed Windows features
$features = Get-WindowsFeature

# Loop through the list of features and output the names of the installed features
foreach ($feature in $features) {
    if ($feature.Installed) {
        Write-Host $feature.Name
    }
}


```

Provide list of installed features and provide an option to remove the features.

```js

# Get a list of installed Windows features
$features = Get-WindowsFeature | Where-Object { $_.Installed -eq $true }

# If no features are installed, display a message and exit the script
if ($features.Count -eq 0) {
    Write-Host "No Windows features are currently installed."
    exit
}

# Loop through the list of installed features and number them
for ($i = 0; $i -lt $features.Count; $i++) {
    Write-Host "$($i+1). $($features[$i].Name)"
}

# Prompt the user to select a feature to remove
$selection = Read-Host "Enter the number of the feature you want to remove (press Enter to exit):"

# If the user did not enter a number, exit the script
if (-not [int]::TryParse($selection, [ref]$null)) {
    exit
}

# Convert the user's selection to a zero-based index
$index = [int]$selection - 1

# If the user entered an invalid number, display an error message and exit the script
if ($index -lt 0 -or $index -ge $features.Count) {
    Write-Host "Invalid selection. Please try again."
    exit
}

# Prompt the user to confirm that they want to remove the selected feature
$confirm = Read-Host "Are you sure you want to remove $($features[$index].Name)? (Y/N)"

# If the user confirmed, remove the selected feature
if ($confirm.ToLower() -eq 'y') {
    Uninstall-WindowsFeature -Name $features[$index].Name -Remove
    Write-Host "$($features[$index].Name) has been removed."
}
else {
    Write-Host "Operation cancelled by user."
}

```
