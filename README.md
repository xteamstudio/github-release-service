# github-release-service

Generate release note automatic

### Start the server
```yml
version: '3'
services:
  zenhubhook:
    image: echoulen/github-release-service:latest
    ports:
      - "4000:4000"
    environment:
      - GITHUB_TOKEN=123
```

### Webhook configuration

- Payload URL
`YOURDOMAIN:4000`

- Content type `application/x-www-form-urlencoded`

- Select the `Let me select individual events` | `Releases`

- Check the `Active`
