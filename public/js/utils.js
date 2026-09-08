(() => {
  function formatTanggalIndonesia(value) {
    if (!value) {
      return "-";
    }

    const tanggal = new Date(`${value}T00:00:00`);

    if (Number.isNaN(tanggal.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(tanggal);
  }

  function formatAngka(value) {
    const angka = Number(value);

    if (!Number.isFinite(angka)) {
      return "0";
    }

    return new Intl.NumberFormat("id-ID").format(angka);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.PosgaUtils = {
    formatTanggalIndonesia,
    formatAngka,
    escapeHtml,
  };
})();
