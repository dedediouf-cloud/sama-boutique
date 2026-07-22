  // ===================== ROBUST CSV IMPORT =====================
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvText = event.target?.result as string;
        const lines = csvText.trim().split(/\r?\n/);

        if (lines.length < 2) {
          alert("Le fichier CSV est vide ou mal formaté.");
          setImporting(false);
          return;
        }

        // Détection intelligente du délimiteur (très important pour Excel français)
        const firstLine = lines[0];
        const delimiter = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";

        // Normalisation des en-têtes (suppression accents + minuscules)
        const rawHeaders = firstLine
          .split(delimiter)
          .map((h) =>
            h.trim()
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
          );

        const productsToImport = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(delimiter).map((v) => v.trim());
          if (!values[0]) continue;

          const row: any = {};
          rawHeaders.forEach((header, index) => {
            const val = values[index] || "";

            if (header.includes("nom") || header.includes("produit")) {
              row.name = val;
            } else if (header.includes("categorie") || header.includes("cat")) {
              row.category = val;
            } else if (header.includes("prix")) {
              row.price = val;
            } else if (header.includes("quant")) {
              row.quantity = val;
            } else if (header.includes("seuil") || header.includes("alerte")) {
              row.lowStock = val;
            } else if (header.includes("description") || header.includes("desc")) {
              row.description = val;
            }
          });

          // On n'importe que si on a au moins un nom correct
          if (row.name && row.name.length > 2) {
            productsToImport.push({
              name: row.name,
              category: row.category || "",
              price: parseFloat(row.price) || 0,
              quantity: parseInt(row.quantity) || 0,
              lowStock: parseInt(row.lowStock) || 5,
              description: row.description || "",
            });
          }
        }

        if (productsToImport.length === 0) {
          alert("Aucun produit valide trouvé.\n\nVérifiez que votre fichier a une colonne 'Nom du produit' (ou 'Nom').");
          setImporting(false);
          return;
        }

        const res = await fetch("/api/products/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products: productsToImport }),
        });

        const result = await res.json();
        if (res.ok) {
          alert(`${result.imported} produit(s) importé(s) avec succès !`);
          fetchProducts();
        } else {
          alert(result.error || "Erreur lors de l'import");
        }
      } catch (err) {
        console.error(err);
        alert("Erreur lors de la lecture du CSV. Essayez avec un fichier simple (séparateur virgule ou point-virgule).");
      }
      setImporting(false);
      e.target.value = "";
    };
    reader.readAsText(file, "UTF-8");
  };
  // ===================== END ROBUST CSV =====================