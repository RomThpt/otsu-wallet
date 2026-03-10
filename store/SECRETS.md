# Store Submission Secrets

The following GitHub repository secrets are required for automated store publishing.

## Chrome Web Store

| Secret | Description | How to get it |
|---|---|---|
| `CHROME_EXTENSION_ID` | Your extension's ID from the Chrome Web Store dashboard | Upload once manually, then copy the ID from the URL |
| `CHROME_CLIENT_ID` | OAuth2 client ID | Google Cloud Console > APIs > Credentials > OAuth 2.0 |
| `CHROME_CLIENT_SECRET` | OAuth2 client secret | Same as above |
| `CHROME_REFRESH_TOKEN` | OAuth2 refresh token | Use `chrome-webstore-upload` CLI to generate |

### Setup steps

1. Register as a Chrome Web Store developer ($5 one-time fee): https://chrome.google.com/webstore/devconsole
2. Do an initial manual upload of the extension zip to get the extension ID
3. Create a Google Cloud project and enable the Chrome Web Store API
4. Create OAuth 2.0 credentials (Desktop application type)
5. Generate a refresh token:
   ```bash
   npx chrome-webstore-upload-cli init \
     --client-id YOUR_CLIENT_ID \
     --client-secret YOUR_CLIENT_SECRET
   ```
6. Add all four values as GitHub repository secrets

## Firefox Add-ons (AMO)

| Secret | Description | How to get it |
|---|---|---|
| `AMO_JWT_ISSUER` | API key (JWT issuer) | AMO Developer Hub > Manage API Keys |
| `AMO_JWT_SECRET` | API secret (JWT secret) | Same as above |

### Setup steps

1. Register at https://addons.mozilla.org/developers/
2. Do an initial manual submission to establish the listing
3. Go to https://addons.mozilla.org/developers/addon/api/key/
4. Generate API credentials
5. Add both values as GitHub repository secrets

## Setting secrets

```bash
# Chrome
gh secret set CHROME_EXTENSION_ID
gh secret set CHROME_CLIENT_ID
gh secret set CHROME_CLIENT_SECRET
gh secret set CHROME_REFRESH_TOKEN

# Firefox
gh secret set AMO_JWT_ISSUER
gh secret set AMO_JWT_SECRET
```

## Notes

- The publish jobs have `continue-on-error: true` so the GitHub Release is always created even if store submission fails
- Beta/RC tags (containing "beta" or "rc") skip store publishing and only create a GitHub Release
- The first submission to each store must be done manually to establish the listing
