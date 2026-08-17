// Supabase browser-safe client configuration.
// Never place secret/service_role keys in this file.
window.SUPABASE_CONFIG = {
  url: "https://qdbvhofbixdbwlnqyqxj.supabase.co",
  publishableKey: "sb_publishable_RMEfvZpJ3aNP3t2Bui-kOw_tOmYhGQ-"
};

// Load the in-app manual and personalized input policy after the page DOM exists.
window.addEventListener('DOMContentLoaded', () => {
  const help = document.createElement('script');
  help.src = './app-help.js?v=20260817';
  help.defer = true;
  document.body.appendChild(help);
});
