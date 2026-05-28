# Eletromidia Artifacts

Documentação técnica visual gerada por agentes. Artefatos HTML standalone com o design system da Eletromidia.

→ [iskisraell.github.io/em-artifacts](https://iskisraell.github.io/em-artifacts/)

## Como funciona

Cada artefato é uma pasta `YYYY-MM-DD-slug/` contendo:

```
YYYY-MM-DD-slug/
├── index.html        # artefato standalone (abre direto no navegador)
├── metadata.json     # título, data, descrição, tags, seções
└── media/            # screenshots, vídeos, diagramas (opcional)
```

### Indexação automática

Todo push que adiciona ou modifica um `metadata.json` dispara o workflow `index-hub.yml`. Ele:

1. Escaneia todos os diretórios de artefatos
2. Lê os `metadata.json`
3. Reconstroi o `index.html` da raiz com busca, time buckets e "Copiar prompt"

### Adicionar um artefato manualmente

1. Crie a pasta `YYYY-MM-DD-slug/`
2. Coloque `index.html` + `metadata.json`
3. Faça push — o GitHub Actions atualiza o hub automaticamente

### metadata.json schema

```json
{
  "title": "Título do artefato.",
  "date": "2026-05-28",
  "description": "Descrição curta do que o artefato cobre.",
  "tags": ["tag1", "tag2"],
  "sections": ["Contexto", "Deep Dive", "Próximos passos"]
}
```

## Design system

Eletromidia — Rethink Sans, `#FF4F00` orange, `#4E18FF` purple, flat design, border-radius 18px, sem sombras, sem gradientes. Gerado pelo skill [`eletromidia-artifact`](https://github.com/iskisraell/eletromidia-artifact) (privado).

## Repositório

https://github.com/iskisraell/em-artifacts
