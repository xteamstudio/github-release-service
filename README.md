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
      - PREFIX=M- /* optional */
      - URL_PATTERN=https://xxx.xxx.io/issue?id=#{ISSUE_NO}
      /* URL_PATTERN required if set PREFIX, #{ISSUE_NO} will been replaced by issue number */
```

### Webhook configuration

- Payload URL
`YOURDOMAIN:4000`

- Content type `application/x-www-form-urlencoded`

- Select the `Let me select individual events` | `Releases`

- Check the `Active`
