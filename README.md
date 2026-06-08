# Sistema de Emissão de NFS-e

Sistema SaaS para emissão de Notas Fiscais de Serviço (NFS-e), desenvolvido com Node.js, TypeScript, Express, Prisma e PostgreSQL.

## Objetivo

O objetivo deste projeto é permitir que empresas emitam notas fiscais de serviço de forma rápida, organizada e segura.

Cada empresa possui seu próprio ambiente com:

- Usuários
- Clientes
- Serviços
- Notas Fiscais

O sistema foi projetado utilizando arquitetura em camadas e preparado para integração futura com a NFS-e Nacional.

## Tecnologias

- Node.js
- TypeScript
- Express
- Prisma ORM
- PostgreSQL
- Docker
- JWT
- Zod

## Arquitetura

Route
↓
Controller
↓
Service
↓
Repository
↓
Prisma
↓
PostgreSQL

## Estrutura do Projeto

src
├── controllers
├── database
├── dtos
├── entities
├── errors
├── factories
├── middleware
├── routes
├── services
└── server.ts

## Funcionalidades Planejadas

- [x] Configuração inicial do projeto
- [x] Docker
- [x] PostgreSQL
- [x] Prisma
- [x] Primeira rota da API

- [ ] Autenticação
- [ ] Empresas
- [ ] Usuários
- [ ] Clientes
- [ ] Serviços
- [ ] Notas Fiscais
- [ ] Integração com NFS-e Nacional

## Status do Projeto

🚧 Em desenvolvimento
