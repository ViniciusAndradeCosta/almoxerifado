import prisma from "../../database/client.js";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Logo: salvar em back/src/assets/logo-hiper.png
const LOGO_PATH = path.join(__dirname, "../../assets/logo-hiper.png");

// Lê a logo como base64 uma vez ao iniciar (mais confiável que filename no ExcelJS)
let LOGO_BASE64 = null;
try {
  if (fs.existsSync(LOGO_PATH)) {
    LOGO_BASE64 = fs.readFileSync(LOGO_PATH).toString("base64");
  }
} catch(e) { console.warn("[FichaController] Logo não encontrada:", LOGO_PATH); }

// Endereços por empresa
const ENDERECOS = {
  HIPER:                    { end: "Av. Gentil Bicalho, 340 - Carneirinhos, João Monlevade - MG", cnpj: "18.107.045/0002-06" },
  HIPERLANCHES:             { end: "Av. Gentil Bicalho, 340 - Carneirinhos, João Monlevade - MG", cnpj: "18.107.045/0002-06" },
  "HIPERLANCHES MATRIZ":    { end: "Av. Gentil Bicalho, 340 - Carneirinhos, João Monlevade - MG", cnpj: "18.107.045/0002-06" },
  "HIPER LANCHES MATRIZ":   { end: "Av. Gentil Bicalho, 340 - Carneirinhos, João Monlevade - MG", cnpj: "18.107.045/0002-06" },
  "SUPER FILIAL":           { end: "Av. Wilson Alvarenga, 700 - Carneirinhos, João Monlevade - MG", cnpj: "18.107.045/0003-97" },
  "HIPERLANCHES FILIAL":    { end: "Av. Wilson Alvarenga, 700 - Carneirinhos, João Monlevade - MG", cnpj: "18.107.045/0003-97" },
  "HIPER LANCHES FILIAL":   { end: "Av. Wilson Alvarenga, 700 - Carneirinhos, João Monlevade - MG", cnpj: "18.107.045/0003-97" },
  "SUPER MATRIZ":           { end: "Av. Getúlio Vargas, 4164 - Carneirinhos, João Monlevade - MG", cnpj: "18.107.045/0001-25" },
};

const COR = {
  VERMELHO:   "C0392B", VERM_ESC:  "922B21",
  CINZA_BG:   "F2F2F2", CINZA_HDR: "555555",
  CINZA_FT:   "666666", VERDE:     "1E8449",
  VERDE_ESC:  "1E6A35", LARANJA:   "D68910",
  AZUL:       "1A5276", BRANCO:    "FFFFFF",
  LINHA_PAR:  "FAFAFA", LINHA_IMPAR:"FFFFFF",
  FUNDO_DEV:  "F0FFF4",
};

function fmt(date) {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function applyBorder(cell, cor = "DDDDDD") {
  const s = { style: "thin", color: { argb: `FF${cor}` } };
  cell.border = { left: s, right: s, top: s, bottom: s };
}

function styleCell(cell, {
  bold = false, size = 9, color = "000000", bg = null,
  align = "left", italic = false, border = true, wrap = false,
} = {}) {
  cell.font = { name: "Calibri", bold, size, color: { argb: `FF${color}` }, italic };
  cell.alignment = { horizontal: align, vertical: "middle", wrapText: wrap };
  if (bg) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${bg}` } };
  if (border) applyBorder(cell);
}

function mergeAndStyle(ws, r1, c1, r2, c2, value, opts = {}) {
  ws.mergeCells(r1, c1, r2, c2);
  const cell = ws.getCell(r1, c1);
  cell.value = value;
  styleCell(cell, opts);
  return cell;
}

function headerRow(ws, r, headers, aligns, bgColor, height = 18) {
  headers.forEach((h, i) => {
    const c = ws.getCell(r, i + 1);
    c.value = h;
    styleCell(c, { bold: true, size: 8, color: "FFFFFF", bg: bgColor, align: aligns[i] });
  });
  ws.getRow(r).height = height;
}

function dataRow(ws, r, values, aligns, isBgAlt, customColor = null) {
  const bg = isBgAlt ? COR.LINHA_PAR : COR.LINHA_IMPAR;
  values.forEach((v, i) => {
    const c = ws.getCell(r, i + 1);
    c.value = v ?? "—";
    styleCell(c, {
      size: 8.5,
      color: customColor?.[i] || "000000",
      bg,
      align: aligns[i],
      bold: !!(customColor?.[i]),
    });
  });
  ws.getRow(r).height = 17;
}

// ═══════════════════════════════════════
// CONTROLLER PRINCIPAL
// ═══════════════════════════════════════
// Função compartilhada que monta os dados — usada por Excel e PDF
async function buscarDadosFicha(empId) {
  const emp = await prisma.employee.findUnique({ where: { id: empId } });
  if (!emp) return null;

  const saidas = await prisma.allWithdrawal.findMany({
    where: { employeeId: empId, tipoMovimento: { notIn: ["DEVOLUCAO_ESTOQUE","DEVOLUCAO_DESCARTE"] } },
    orderBy: { withdrawalDate: "desc" },
  });
  const devolucoes = await prisma.allWithdrawal.findMany({
    where: { employeeId: empId, tipoMovimento: { in: ["DEVOLUCAO_ESTOQUE","DEVOLUCAO_DESCARTE"] } },
    orderBy: { withdrawalDate: "desc" },
  });
  const descartes = await prisma.discardedItem.findMany({
    where: { OR: [
      { discardedBy: { contains: emp.name.split(" ")[0], mode: "insensitive" } },
      { notes: { contains: emp.name.split(" ")[0], mode: "insensitive" } },
    ]},
    include: { item: { select: { name:true, type:true, size:true } } },
    orderBy: { discardDate: "desc" },
  });
  // Busca armário pelo nome EXATO do funcionário (evita falsos positivos)
  const armario = await prisma.cabinet.findFirst({
    where: {
      situation: "Ocupado",
      name: { equals: emp.name.trim(), mode: "insensitive" },
    },
  });
  return { emp, saidas, devolucoes, descartes, armario };
}

export async function downloadFichaColaborador(req, res) {
  try {
    const { id } = req.params;
    const empId = parseInt(id);
    const dados = await buscarDadosFicha(empId);
    if (!dados) return res.status(404).json({ error: "Funcionário não encontrado." });
    const { emp, saidas, devolucoes, descartes, armario } = dados;

    // KPIs
    const totalPecas = saidas.reduce((a, s) => a + s.quantity, 0);
    const totalDev   = devolucoes.reduce((a, d) => a + d.quantity, 0);
    const totalDesc  = descartes.reduce((a, d) => a + d.quantity, 0);

    const endInfo = ENDERECOS[emp.company?.toUpperCase()] || { end: emp.company || "—", cnpj: "" };
    const tamanhos = [emp.shirt_size, emp.pants_size, emp.shoes_size].filter(Boolean).join("  /  ") || "Não informado";

    // ── MONTAR O WORKBOOK ──────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = "Almoxarifado Hiper";
    wb.created = new Date();
    const ws = wb.addWorksheet("Ficha do Colaborador");

    // Larguras das colunas
    [3, 24, 16, 12, 10, 14, 13, 16, 24].forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });

    let R = 1;

    // ── CABEÇALHO COM LOGO ──
    // Coluna A: reservada para a logo (largura maior)
    ws.getColumn(1).width = 14; // ~100px — espaço da logo

    // Fundo vermelho em toda a área do cabeçalho (4 linhas)
    for (let r = 1; r <= 4; r++) {
      for (let ci = 1; ci <= 9; ci++) {
        const hc = ws.getCell(r, ci);
        hc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COR.VERMELHO}` } };
      }
    }
    ws.getRow(1).height = 8;
    ws.getRow(2).height = 28;
    ws.getRow(3).height = 18;
    ws.getRow(4).height = 8;

    // Título e subtítulo começam na coluna 2 (após o espaço da logo)
    const titulo = ws.getCell(2, 2);
    titulo.value = "HIPER COMERCIAL MONLEVADE";
    styleCell(titulo, { bold:true, size:15, color:"FFFFFF", bg:COR.VERMELHO, align:"left", border:false });
    ws.mergeCells(2, 2, 2, 9);

    const subtitulo = ws.getCell(3, 2);
    subtitulo.value = "ALMOXARIFADO  —  FICHA INDIVIDUAL DO COLABORADOR";
    styleCell(subtitulo, { size:9, color:"FFB3B3", bg:COR.VERMELHO, align:"left", border:false });
    ws.mergeCells(3, 2, 3, 9);

    // Logo — posicionada dentro da coluna A (não ultrapassa)
    if (LOGO_BASE64) {
      const logoId = wb.addImage({
        base64: LOGO_BASE64,
        extension: "png",
      });
      ws.addImage(logoId, {
        tl: { col: 0, row: 0 },      // começa em A1
        br: { col: 1, row: 4 },      // termina em B4 (fica dentro da col A)
        editAs: "oneCell",
      });
    }

    R = 5; ws.getRow(R).height = 8; R++;

    // ── IDENTIFICAÇÃO ──
    mergeAndStyle(ws,R,1,R,9,"  IDENTIFICAÇÃO DO COLABORADOR",
      { bold:true, size:9, color:"FFFFFF", bg:"333333", border:false });
    ws.getRow(R).height = 20; R++;

    // Nome
    ws.getRow(R).height = 24;
    ws.mergeCells(R,1,R,2); const cn = ws.getCell(R,1);
    cn.value = "NOME COMPLETO"; styleCell(cn, { bold:true, size:8, color:COR.CINZA_FT, bg:COR.CINZA_BG });
    ws.mergeCells(R,3,R,9); const cv = ws.getCell(R,3);
    cv.value = emp.name; styleCell(cv, { bold:true, size:12, color:COR.VERMELHO, bg:COR.BRANCO }); R++;

    // Empresa | Departamento
    ws.getRow(R).height = 18;
    ws.mergeCells(R,1,R,2); let c = ws.getCell(R,1); c.value="EMPRESA"; styleCell(c,{bold:true,size:8,color:COR.CINZA_FT,bg:COR.CINZA_BG});
    ws.mergeCells(R,3,R,5); c = ws.getCell(R,3); c.value=emp.company||"—"; styleCell(c,{bold:true,size:9,bg:COR.BRANCO});
    c = ws.getCell(R,6); c.value="DEPARTAMENTO"; styleCell(c,{bold:true,size:8,color:COR.CINZA_FT,bg:COR.CINZA_BG});
    ws.mergeCells(R,7,R,9); c = ws.getCell(R,7); c.value=emp.department||"—"; styleCell(c,{bold:true,size:9,bg:COR.BRANCO}); R++;

    // Cargo | Admissão
    ws.getRow(R).height = 18;
    ws.mergeCells(R,1,R,2); c = ws.getCell(R,1); c.value="CARGO"; styleCell(c,{bold:true,size:8,color:COR.CINZA_FT,bg:COR.CINZA_BG});
    ws.mergeCells(R,3,R,5); c = ws.getCell(R,3); c.value=emp.role||"—"; styleCell(c,{bold:true,size:9,bg:COR.BRANCO});
    c = ws.getCell(R,6); c.value="DATA DE ADMISSÃO"; styleCell(c,{bold:true,size:8,color:COR.CINZA_FT,bg:COR.CINZA_BG});
    ws.mergeCells(R,7,R,9); c = ws.getCell(R,7); c.value=fmt(emp.admissionDate); styleCell(c,{bold:true,size:9,bg:COR.BRANCO}); R++;

    // Tamanhos | Armário
    ws.getRow(R).height = 18;
    ws.mergeCells(R,1,R,2); c = ws.getCell(R,1); c.value="TAMANHOS (Camisa/Calça/Calçado)"; styleCell(c,{bold:true,size:8,color:COR.CINZA_FT,bg:COR.CINZA_BG});
    ws.mergeCells(R,3,R,5); c = ws.getCell(R,3); c.value=tamanhos; styleCell(c,{bold:true,size:9,color:COR.AZUL,bg:COR.BRANCO});
    c = ws.getCell(R,6); c.value="ARMÁRIO"; styleCell(c,{bold:true,size:8,color:COR.CINZA_FT,bg:COR.CINZA_BG});
    ws.mergeCells(R,7,R,9); c = ws.getCell(R,7);
    c.value = armario ? `Nº ${armario.number} — Setor ${armario.sector}` : "Não vinculado";
    styleCell(c,{bold:!!armario,size:9,bg:COR.BRANCO,color:armario?"000000":COR.CINZA_FT}); R++;

    // Endereço | Gerado em
    ws.getRow(R).height = 18;
    ws.mergeCells(R,1,R,2); c = ws.getCell(R,1); c.value="ENDEREÇO"; styleCell(c,{bold:true,size:8,color:COR.CINZA_FT,bg:COR.CINZA_BG});
    ws.mergeCells(R,3,R,5); c = ws.getCell(R,3); c.value=endInfo.end; styleCell(c,{size:8,bg:COR.BRANCO,wrap:true});
    c = ws.getCell(R,6); c.value="GERADO EM"; styleCell(c,{bold:true,size:8,color:COR.CINZA_FT,bg:COR.CINZA_BG});
    ws.mergeCells(R,7,R,9); c = ws.getCell(R,7);
    c.value = new Date().toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"});
    styleCell(c,{size:8,color:COR.CINZA_FT,bg:COR.BRANCO}); R++;

    ws.getRow(R).height = 8; R++;

    // ── KPIs ──
    mergeAndStyle(ws,R,1,R,9,"  RESUMO DE MOVIMENTAÇÕES",
      { bold:true, size:9, color:"FFFFFF", bg:"333333", border:false });
    ws.getRow(R).height = 20; R++;

    const kpis = [
      { label:"TOTAL DE SAÍDAS", val:saidas.length, cor:COR.VERMELHO, c1:1, c2:3 },
      { label:"PEÇAS ENTREGUES", val:totalPecas,     cor:COR.AZUL,    c1:4, c2:5 },
      { label:"DEVOLVIDAS",      val:devolucoes.length, cor:COR.VERDE, c1:6, c2:7 },
      { label:"DESCARTADAS",     val:descartes.length,  cor:COR.LARANJA, c1:8, c2:9 },
    ];
    kpis.forEach(({ label, val, cor, c1, c2 }) => {
      ws.mergeCells(R,c1,R,c2);
      let kc = ws.getCell(R,c1); kc.value=label;
      styleCell(kc,{bold:true,size:7,color:"FFFFFF",bg:cor,align:"center"}); applyBorder(kc,cor);
      ws.mergeCells(R+1,c1,R+1,c2);
      kc = ws.getCell(R+1,c1); kc.value=val;
      styleCell(kc,{bold:true,size:22,color:cor,bg:COR.BRANCO,align:"center"});
    });
    ws.getRow(R).height = 15; ws.getRow(R+1).height = 34; R+=2;
    ws.getRow(R).height = 8; R++;

    // ── TABELA SAÍDAS ──
    mergeAndStyle(ws,R,1,R,9,"  HISTÓRICO DE SAÍDAS — UNIFORMES E EPIs ENTREGUES",
      { bold:true, size:9, color:"FFFFFF", bg:COR.VERMELHO, border:false });
    ws.getRow(R).height = 20; R++;

    const hdrs   = ["Nº","ITEM / DESCRIÇÃO","TIPO","TAMANHO","QTDE","DATA SAÍDA","ORIGEM","STATUS","OBSERVAÇÃO"];
    const aligns = ["center","left","left","center","center","center","center","center","left"];
    headerRow(ws, R, hdrs, aligns, COR.CINZA_HDR); R++;

    if (saidas.length === 0) {
      ws.mergeCells(R,1,R,9);
      const ce = ws.getCell(R,1); ce.value = "Nenhuma saída registrada.";
      styleCell(ce,{size:9,color:COR.CINZA_FT,align:"center",bg:"FAFAFA",italic:true});
      ws.getRow(R).height = 18; R++;
    } else {
      saidas.forEach((s, idx) => {
        const isAtivo = !devolucoes.find(d => d.idWithdrawal === s.idWithdrawal);
        const customColor = {
          6: s.tipoMovimento === "DEVOLUCAO_ESTOQUE" ? COR.AZUL : (s.origemPeca === "DEVOLVIDA" ? COR.AZUL : null),
          7: isAtivo ? COR.VERDE : COR.LARANJA,
        };
        dataRow(ws, R,
          [idx+1, s.itemName||"—", s.itemType||"—", s.itemSize||"—", s.quantity,
           fmt(s.withdrawalDate), s.origemPeca||"NOVA",
           isAtivo ? "ATIVO" : "DEVOLVIDO", ""],
          aligns, idx%2===0, customColor);
        R++;
      });
      // Total
      ws.mergeCells(R,1,R,4);
      const ct = ws.getCell(R,1); ct.value="TOTAL DE PEÇAS ENTREGUES";
      styleCell(ct,{bold:true,size:8.5,color:"FFFFFF",bg:"333333",align:"right"});
      const ctv = ws.getCell(R,5); ctv.value=totalPecas;
      styleCell(ctv,{bold:true,size:11,color:COR.VERMELHO,bg:"333333",align:"center"});
      for(let i=6;i<=9;i++){const cc=ws.getCell(R,i);cc.fill={type:"pattern",pattern:"solid",fgColor:{argb:`FF333333`}};applyBorder(cc);}
      ws.getRow(R).height = 18; R++;
    }
    ws.getRow(R).height = 10; R++;

    // ── TABELA DEVOLUÇÕES ──
    mergeAndStyle(ws,R,1,R,9,"  HISTÓRICO DE DEVOLUÇÕES",
      { bold:true, size:9, color:"FFFFFF", bg:COR.VERDE, border:false });
    ws.getRow(R).height = 20; R++;

    const hdrs2   = ["Nº","ITEM / DESCRIÇÃO","TIPO","TAMANHO","QTDE","DATA DEVOLUÇÃO","DESTINO","MOTIVO","OBSERVAÇÃO"];
    const aligns2 = ["center","left","left","center","center","center","center","left","left"];
    headerRow(ws, R, hdrs2, aligns2, COR.VERDE_ESC); R++;

    if (devolucoes.length === 0) {
      ws.mergeCells(R,1,R,9);
      const ce = ws.getCell(R,1); ce.value = "Nenhuma devolução registrada.";
      styleCell(ce,{size:9,color:COR.CINZA_FT,align:"center",bg:"FAFAFA",italic:true});
      ws.getRow(R).height = 18; R++;
    } else {
      devolucoes.forEach((d, idx) => {
        const destino = d.tipoMovimento === "DEVOLUCAO_DESCARTE" ? "DESCARTE" : "ESTOQUE";
        const customColor = { 6: destino === "DESCARTE" ? COR.VERMELHO : COR.VERDE };
        dataRow(ws, R,
          [idx+1, d.itemName||"—", d.itemType||"—", d.itemSize||"—", d.quantity,
           fmt(d.withdrawalDate), destino, "—", ""],
          aligns2, idx%2===0, customColor);
        R++;
      });
    }
    ws.getRow(R).height = 10; R++;

    // ── TABELA DESCARTES (se houver) ──
    if (descartes.length > 0) {
      mergeAndStyle(ws,R,1,R,9,"  ITENS DESCARTADOS",
        { bold:true, size:9, color:"FFFFFF", bg:COR.LARANJA, border:false });
      ws.getRow(R).height = 20; R++;

      const hdrs3   = ["Nº","ITEM / DESCRIÇÃO","TIPO","TAMANHO","QTDE","DATA DESCARTE","MOTIVO","RESPONSÁVEL","OBSERVAÇÃO"];
      headerRow(ws, R, hdrs3, aligns2, "966508"); R++;

      descartes.forEach((d, idx) => {
        dataRow(ws, R,
          [idx+1, d.item?.name||"—", d.item?.type||"—", d.item?.size||"—", d.quantity,
           fmt(d.discardDate), d.reason||"—", d.discardedBy||"—", d.notes||"—"],
          aligns2, idx%2===0);
        R++;
      });
      ws.getRow(R).height = 10; R++;
    }

    // ── RODAPÉ ──
    ws.mergeCells(R,1,R,9);
    const rf = ws.getCell(R,1);
    rf.value = `Documento gerado automaticamente pelo Sistema de Almoxarifado — Hiper Comercial Monlevade  |  ${new Date().toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}`;
    styleCell(rf,{size:7.5,italic:true,color:"999999",bg:"F5F5F5",align:"center",border:false});
    ws.getRow(R).height = 15;

    // Impressão paisagem
    ws.pageSetup.orientation = "landscape";
    ws.pageSetup.fitToPage = true;
    ws.pageSetup.fitToWidth = 1;
    ws.pageSetup.margins = { left:0.4, right:0.4, top:0.5, bottom:0.5, header:0.3, footer:0.3 };

    // Enviar
    const buf = await wb.xlsx.writeBuffer();
    const nomeArquivo = `Ficha_${emp.name.replace(/\s+/g,"_")}_${new Date().toISOString().split("T")[0]}.xlsx`;

    res.set({
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    res.send(Buffer.from(buf));

  } catch (error) {
    console.error("[downloadFichaColaborador] Erro:", error);
    res.status(500).json({ error: error.message });
  }
}


// ── DOWNLOAD PDF com PDFKit ─────────────────────────────────────────────────
export async function downloadFichaColaboradorPDF(req, res) {
  try {
    const { id } = req.params;
    const dados = await buscarDadosFicha(parseInt(id));
    if (!dados) return res.status(404).json({ error: "Funcionário não encontrado." });
    const { emp, saidas, devolucoes, descartes, armario } = dados;

    const endInfo = ENDERECOS[emp.company?.toUpperCase()] || { end: emp.company || "—", cnpj: "" };
    const tamanhos = [emp.shirt_size, emp.pants_size, emp.shoes_size].filter(Boolean).join(" / ") || "Não informado";
    const totalPecas = saidas.reduce((a,s)=>a+s.quantity,0);
    const now = new Date().toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"});

    // Importação dinâmica do PDFKit (ESM)
    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 28 });

    const chunks = [];
    doc.on("data", chunk => chunks.push(chunk));
    const pdfDone = new Promise((resolve, reject) => {
      doc.on("end", resolve);
      doc.on("error", reject);
    });

    // Cores
    const RED    = "#C0392B";
    const DARK   = "#222222";
    const BLUE   = "#1A5276";
    const GREEN  = "#1E8449";
    const ORANGE = "#D68910";
    const GRAY   = "#666666";
    const WHITE  = "#FFFFFF";
    const L_GRAY = "#F2F2F2";
    const L_GREEN= "#F0FFF4";

    const pageW = doc.page.width - 56; // largura útil (margem 28 dos dois lados)
    let y = 28;

    // ── CABEÇALHO ──────────────────────────────────────────
    doc.rect(28, y, pageW, 76).fill(RED);

    // Logo
    if (LOGO_BASE64) {
      const logoBuf = Buffer.from(LOGO_BASE64, "base64");
      doc.image(logoBuf, 36, y + 6, { width: 64, height: 64 });
    }

    doc.fillColor(WHITE)
       .font("Helvetica-Bold").fontSize(18)
       .text("HIPER COMERCIAL MONLEVADE", 112, y + 14, { width: pageW - 90 });
    doc.font("Helvetica").fontSize(9).fillColor("#FFB3B3")
       .text("ALMOXARIFADO  —  FICHA INDIVIDUAL DO COLABORADOR", 112, y + 38, { width: pageW - 90 });
    doc.font("Helvetica").fontSize(7).fillColor("rgba(255,255,255,0.6)")
       .text(`Gerado em: ${now}`, 112, y + 54, { width: pageW - 90 });
    y += 84;

    // ── IDENTIFICAÇÃO ──────────────────────────────────────
    doc.rect(28, y, pageW, 14).fill(DARK);
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(8).text("  IDENTIFICAÇÃO DO COLABORADOR", 30, y + 3);
    y += 17;

    const drawInfoRow = (label1, val1, label2, val2, h=16, colorVal1="black", colorVal2="black") => {
      const half = pageW / 2;
      // célula 1
      doc.rect(28, y, 110, h).fill(L_GRAY).rect(138, y, half - 110, h).fill(WHITE);
      doc.fillColor(GRAY).font("Helvetica-Bold").fontSize(7).text(label1, 30, y + 4, { width: 106 });
      doc.fillColor(colorVal1).font("Helvetica-Bold").fontSize(8).text(String(val1||"—"), 140, y + 4, { width: half - 115 });
      // célula 2
      doc.rect(28 + half, y, 110, h).fill(L_GRAY).rect(138 + half, y, half - 110, h).fill(WHITE);
      doc.fillColor(GRAY).font("Helvetica-Bold").fontSize(7).text(label2, 30 + half, y + 4, { width: 106 });
      doc.fillColor(colorVal2).font("Helvetica-Bold").fontSize(8).text(String(val2||"—"), 140 + half, y + 4, { width: half - 115 });
      // bordas
      doc.rect(28, y, pageW, h).stroke("#DDDDDD");
      y += h;
    };

    // Nome (linha completa)
    doc.rect(28, y, 110, 20).fill(L_GRAY).rect(138, y, pageW - 110, 20).fill(WHITE);
    doc.fillColor(GRAY).font("Helvetica-Bold").fontSize(7).text("NOME COMPLETO", 30, y + 6, { width: 106 });
    doc.fillColor(RED).font("Helvetica-Bold").fontSize(14).text(emp.name, 140, y + 3, { width: pageW - 115 });
    doc.rect(28, y, pageW, 20).stroke("#DDDDDD");
    y += 22;

    drawInfoRow("EMPRESA", emp.company, "DEPARTAMENTO", emp.department);
    drawInfoRow("CARGO", emp.role, "DATA DE ADMISSÃO", fmt(emp.admissionDate));
    drawInfoRow("TAMANHOS (Camisa/Calça/Calçado)", tamanhos, "ARMÁRIO",
      armario ? `Nº ${armario.number} — Setor ${armario.sector}` : "Não vinculado",
      16, BLUE, "black");
    drawInfoRow("ENDEREÇO", endInfo.end, "CNPJ", endInfo.cnpj, 16, "black", GRAY);
    y += 8;

    // ── KPIs ───────────────────────────────────────────────
    const kpiW = pageW / 4;
    const kpis = [
      { label: "TOTAL DE SAÍDAS",   val: saidas.length,      color: RED    },
      { label: "PEÇAS ENTREGUES",   val: totalPecas,          color: BLUE   },
      { label: "DEVOLVIDAS",        val: devolucoes.length,   color: GREEN  },
      { label: "DESCARTADAS",       val: descartes.length,    color: ORANGE },
    ];
    kpis.forEach(({ label, val, color }, i) => {
      const x = 28 + i * kpiW;
      doc.rect(x, y, kpiW, 14).fill(color);
      doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(6.5).text(label, x + 2, y + 4, { width: kpiW - 4, align: "center" });
      doc.rect(x, y + 14, kpiW, 28).fill(WHITE).stroke("#DDDDDD");
      doc.fillColor(color).font("Helvetica-Bold").fontSize(22).text(String(val), x + 2, y + 17, { width: kpiW - 4, align: "center" });
    });
    y += 50;

    // ── TABELA HELPER ──────────────────────────────────────
    const drawTable = (titulo, corTitulo, headers, rows, rowRenderer) => {
      if (y > doc.page.height - 100) { doc.addPage(); y = 28; }

      doc.rect(28, y, pageW, 14).fill(corTitulo);
      doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(8).text(`  ${titulo}`, 30, y + 3);
      y += 16;

      // Header linha
      const colW = pageW / headers.length;
      doc.rect(28, y, pageW, 13).fill("#555555");
      headers.forEach((h, i) => {
        doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(7)
           .text(h, 28 + i * colW + 2, y + 3, { width: colW - 4, align: "center" });
      });
      doc.rect(28, y, pageW, 13).stroke("#444");
      y += 14;

      if (rows.length === 0) {
        doc.rect(28, y, pageW, 14).fill("#FAFAFA");
        doc.fillColor(GRAY).font("Helvetica").fontSize(8).text("Nenhum registro.", 28, y + 3, { width: pageW, align: "center" });
        y += 16; return;
      }

      rows.forEach((row, idx) => {
        if (y > doc.page.height - 50) { doc.addPage(); y = 28; }
        const h = 13;
        const bg = idx % 2 === 0 ? "#F7F7F7" : WHITE;
        doc.rect(28, y, pageW, h).fill(bg);
        rowRenderer(row, idx, colW, y, h);
        doc.rect(28, y, pageW, h).stroke("#DDDDDD");
        y += h;
      });
      y += 6;
    };

    const txt = (text, x, yy, w, align="center", color="black", bold=false, size=8) => {
      doc.fillColor(color).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size)
         .text(String(text ?? "—"), x + 2, yy + 2, { width: w - 4, align, lineBreak: false });
    };

    // ── SAÍDAS ──
    y += 8;
    drawTable(
      "HISTÓRICO DE SAÍDAS — UNIFORMES E EPIs ENTREGUES", RED,
      ["Nº","ITEM / DESCRIÇÃO","TIPO","TAMANHO","QTDE","DATA SAÍDA","ORIGEM","STATUS"],
      saidas,
      (s, idx, colW, yy) => {
        const isAtivo = !devolucoes.find(d=>d.idWithdrawal===s.idWithdrawal);
        txt(idx+1,      28+colW*0, yy, colW);
        txt(s.itemName||"—", 28+colW*1, yy, colW*2, "left");
        txt(s.itemType||"—", 28+colW*3, yy, colW, "left");
        txt(s.itemSize||"—", 28+colW*4, yy, colW);
        txt(s.quantity,  28+colW*5, yy, colW);
        txt(fmt(s.withdrawalDate), 28+colW*6, yy, colW);
        txt(s.origemPeca||"NOVA", 28+colW*7, yy, colW, "center", s.origemPeca==="DEVOLVIDA"?BLUE:"black", s.origemPeca==="DEVOLVIDA");
        // STATUS — não cabe na 9ª coluna em paisagem com 8 colunas, anotamos na última
        // já incluído no ORIGEM implicitamente via status da linha abaixo
      }
    );

    // Linha de total
    doc.rect(28, y, pageW * 0.55, 14).fill(DARK);
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(8).text("TOTAL DE PEÇAS ENTREGUES", 28, y + 3, { width: pageW * 0.55, align: "right" });
    doc.rect(28 + pageW * 0.55, y, pageW * 0.1, 14).fill(DARK);
    doc.fillColor(RED).font("Helvetica-Bold").fontSize(11).text(String(totalPecas), 28 + pageW * 0.55, y + 1, { width: pageW * 0.1, align: "center" });
    doc.rect(28 + pageW * 0.65, y, pageW * 0.35, 14).fill(DARK);
    y += 20;

    // ── DEVOLUÇÕES ──
    drawTable(
      "HISTÓRICO DE DEVOLUÇÕES", GREEN,
      ["Nº","ITEM / DESCRIÇÃO","TIPO","TAMANHO","QTDE","DATA DEV.","DESTINO","MOTIVO"],
      devolucoes,
      (d, idx, colW, yy) => {
        const dest = d.tipoMovimento==="DEVOLUCAO_DESCARTE"?"DESCARTE":"ESTOQUE";
        txt(idx+1,        28+colW*0, yy, colW);
        txt(d.itemName||"—", 28+colW*1, yy, colW*2, "left");
        txt(d.itemType||"—", 28+colW*3, yy, colW, "left");
        txt(d.itemSize||"—", 28+colW*4, yy, colW);
        txt(d.quantity,   28+colW*5, yy, colW);
        txt(fmt(d.withdrawalDate), 28+colW*6, yy, colW);
        txt(dest,         28+colW*7, yy, colW, "center", dest==="DESCARTE"?RED:GREEN, true);
      }
    );

    // ── DESCARTES ──
    if (descartes.length > 0) {
      drawTable(
        "ITENS DESCARTADOS", ORANGE,
        ["Nº","ITEM / DESCRIÇÃO","TIPO","TAMANHO","QTDE","DATA","MOTIVO","RESPONSÁVEL"],
        descartes,
        (d, idx, colW, yy) => {
          txt(idx+1,          28+colW*0, yy, colW);
          txt(d.item?.name||"—", 28+colW*1, yy, colW*2, "left");
          txt(d.item?.type||"—", 28+colW*3, yy, colW, "left");
          txt(d.item?.size||"—", 28+colW*4, yy, colW);
          txt(d.quantity,     28+colW*5, yy, colW);
          txt(fmt(d.discardDate), 28+colW*6, yy, colW);
          txt(d.reason||"—", 28+colW*7, yy, colW, "left");
        }
      );
    }

    // ── RODAPÉ ──
    if (y > doc.page.height - 30) { doc.addPage(); y = 28; }
    doc.rect(28, y, pageW, 14).fill("#F5F5F5");
    doc.fillColor("#999999").font("Helvetica-Oblique").fontSize(7)
       .text(`Documento gerado automaticamente — Sistema de Almoxarifado Hiper Comercial Monlevade  |  ${now}`,
             28, y + 3, { width: pageW, align: "center" });

    doc.end();
    await pdfDone;

    const pdfBuffer = Buffer.concat(chunks);
    const nomeArquivo = `Historico_${emp.name.replace(/\s+/g,"_")}_${new Date().toISOString().split("T")[0]}.pdf`;

    res.set({
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Content-Type": "application/pdf",
    });
    res.send(pdfBuffer);

  } catch (error) {
    console.error("[downloadFichaColaboradorPDF] Erro:", error);
    res.status(500).json({ error: error.message });
  }
}