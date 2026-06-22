import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const MODULOS = [
  { slug: "ponto", nome: "Ponto Eletrônico" },
  { slug: "beneficios", nome: "Benefícios" },
  { slug: "atestados", nome: "Atestados" },
  { slug: "nr1", nome: "NR-1 / Saúde Mental" },
  { slug: "one-on-one", nome: "1:1 (One-on-One)" },
  { slug: "assinatura", nome: "Assinatura Eletrônica" },
  { slug: "denuncias", nome: "Canal de Denúncias" },
];

// Catálogo de permissões: para cada módulo do sistema, 4 ações.
const MODULOS_SISTEMA = ["faturamento", "usuarios", "empresas", "perfis", "auditoria", "configuracoes", "solicitacoes", "historico"];
const ACOES = ["VISUALIZAR", "EDITAR", "EXCLUIR", "EXPORTAR"];

async function main() {
  // 1) Módulos (catálogo de produto)
  for (const m of MODULOS) {
    await prisma.modulo.upsert({ where: { slug: m.slug }, update: { nome: m.nome }, create: { ...m } });
  }
  console.log(`✔ ${MODULOS.length} módulos de produto`);

  // 2) Catálogo de permissões
  for (const modulo of MODULOS_SISTEMA) {
    for (const acao of ACOES) {
      await prisma.permissao.upsert({
        where: { modulo_acao: { modulo, acao } },
        update: {},
        create: { modulo, acao },
      });
    }
  }
  console.log(`✔ ${MODULOS_SISTEMA.length * ACOES.length} permissões`);

  // 3) Tenant demo
  const tenant = await prisma.tenant.upsert({
    where: { subdominio: "demo" },
    update: {},
    create: {
      nome: "Grupo Demonstração",
      subdominio: "demo",
      nomeSistema: "Rhally",
      status: "ATIVO",
    },
  });
  console.log(`✔ tenant demo #${tenant.id}`);

  // 4) Empresa demo (com o CNPJ válido)
  const empresa = await prisma.empresa.upsert({
    where: { cnpj: "26826512000103" },
    update: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      razaoSocial: "Empresa Demonstração LTDA",
      nomeFantasia: "Demo Rhally",
      cnpj: "26826512000103",
    },
  });
  console.log(`✔ empresa demo #${empresa.id} (CNPJ 26826512000103)`);

  // 5) Módulos contratados pelo tenant
  for (const slug of ["ponto", "beneficios", "nr1"]) {
    const mod = await prisma.modulo.findUnique({ where: { slug } });
    if (mod) {
      await prisma.tenantModulo.upsert({
        where: { tenantId_moduloId: { tenantId: tenant.id, moduloId: mod.id } },
        update: { ativo: true },
        create: { tenantId: tenant.id, moduloId: mod.id, ativo: true },
      });
    }
  }
  console.log(`✔ módulos contratados: ponto, beneficios, nr1`);

  // 6) Perfil Administrador (todas as permissões)
  const perfilAdmin = await prisma.perfil.upsert({
    where: { tenantId_nome: { tenantId: tenant.id, nome: "Administrador" } },
    update: {},
    create: { tenantId: tenant.id, nome: "Administrador", descricao: "Acesso total" },
  });
  const todasPermissoes = await prisma.permissao.findMany();
  for (const p of todasPermissoes) {
    await prisma.perfilPermissao.upsert({
      where: { perfilId_permissaoId: { perfilId: perfilAdmin.id, permissaoId: p.id } },
      update: {},
      create: { perfilId: perfilAdmin.id, permissaoId: p.id },
    });
  }
  console.log(`✔ perfil Administrador com ${todasPermissoes.length} permissões`);

  // 7) Usuário admin
  const senhaHash = await bcrypt.hash("demo123", 10);
  const usuario = await prisma.usuario.upsert({
    where: { email: "admin@demo.com.br" },
    update: { tenantId: tenant.id, cpf: "39053344705", isMaster: true },
    create: {
      tenantId: tenant.id,
      nome: "Admin Demo",
      email: "admin@demo.com.br",
      cpf: "39053344705",
      senhaHash,
      cargo: "Operador Master",
      ativo: true,
      isMaster: true,
    },
  });
  // vincula à empresa
  await prisma.usuarioEmpresa.upsert({
    where: { usuarioId_empresaId: { usuarioId: usuario.id, empresaId: empresa.id } },
    update: {},
    create: { usuarioId: usuario.id, empresaId: empresa.id },
  });
  // atribui o perfil Administrador na empresa
  await prisma.usuarioPerfil.upsert({
    where: {
      usuarioId_perfilId_empresaId: {
        usuarioId: usuario.id, perfilId: perfilAdmin.id, empresaId: empresa.id,
      },
    },
    update: {},
    create: { usuarioId: usuario.id, perfilId: perfilAdmin.id, empresaId: empresa.id },
  });
  console.log(`✔ usuário admin@demo.com.br (senha: demo123) com perfil Administrador`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
