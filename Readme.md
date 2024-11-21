# Botrucho

# Generar imagen
```bash
npx dotenv-vault@latest build &&
npx dotenv-vault@latest keys production
```
```bash
docker build -f docker/Dockerfile -t botrucho-image . && docker run -e DOTENV_KEY=${KEY} --name botrucho -p 3000:3000 --rm -d --init botrucho-image
```
