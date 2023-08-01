const interval = setInterval(async () => {
  const target = document.querySelector("#secondary-inner > #panels");
  if (target) {
    clearInterval(interval);
    const module = await import("./pages/Content.svelte");
    new module.default({
      target: target.parentElement,
      anchor: target,
    });
  }
}, 500);
