const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  
  const newPassword = process.argv[2];
  
  if (!newPassword) {
    console.log("❌ Usage: node change-superadmin-password.js TON_MOT_DE_PASSE");
    process.exit(1);
  }
  
  if (newPassword.length < 8) {
    console.log("❌ Le mot de passe doit faire au moins 8 caractères");
    process.exit(1);
  }
  
  try {
    console.log("🔄 Connexion à la base de données Neon...");
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.superAdmin.update({
      where: { email: "superadmin@boutique.com" },
      data: { password: hashedPassword }
    });
    
    console.log("");
    console.log("✅ SUCCÈS ! Le mot de passe du Super Admin a été changé.");
    console.log("Email : superadmin@boutique.com");
    console.log("Nouveau mot de passe : " + newPassword);
    console.log("");
    console.log("→ Maintenant :");
    console.log("   1. Va sur ton site Vercel");
    console.log("   2. Déconnecte-toi");
    console.log("   3. Appuie sur Ctrl + Shift + R");
    console.log("   4. Reconnecte-toi avec le nouveau mot de passe");
  } catch (error) {
    console.error("");
    console.error("❌ ERREUR : " + error.message);
    console.log("");
    console.log("Cause probable :");
    console.log("- Tu n'as pas défini la DATABASE_URL");
    console.log("- Ou le Super Admin n'existe pas");
  } finally {
    await prisma.$disconnect();
  }
}

main();