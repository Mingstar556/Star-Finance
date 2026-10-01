/* ============================================================
   Star Finance — auth.js
   Login / Sign-up screen (client-side demo auth)
   ============================================================ */
window.Auth = (function () {
  "use strict";
  const { $, $$, el, esc, I, toast } = U;
  let mode = "login";
  let onSubmit = null; // (user) => void

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function artPanel() {
    return el("div", { class: "auth-art" },
      el("div", { class: "art-glow g1" }),
      el("div", { class: "art-glow g2" }),
      el("div", { class: "art-spark s1", html: I("star") }),
      el("div", { class: "art-spark s2", html: I("star") }),
      el("div", { class: "art-spark s3", html: I("star") }),
      el("div", { class: "brand" },
        el("span", { class: "brand-logo", html: U.LOGO }),
        el("span", { class: "brand-text" },
          el("span", { class: "brand-name", html: "Star <em>Finance</em>" }),
          el("span", { class: "brand-sub" }, "Wealth, in orbit.")
        )
      ),
      el("div", null,
        el("h1", { class: "art-headline", html: "Your money, in <em>orbit</em>." }),
        el("p", { class: "art-sub" }, "Track balances, spending and investments in one elegant dashboard — with insights that keep your financial universe aligned."),
        el("div", { class: "art-stats" },
          statChip("$128,430", "Average assets tracked"),
          statChip("12 mo", "Full history insights"),
          statChip("2 themes", "Gold & Emerald")
        )
      ),
      el("p", { style: "color: var(--faint); font-size: 12.5px; margin-top: 30px;" }, `© ${new Date().getFullYear()} Star Finance — demo build. All data stays in your browser.`)
    );
  }
  function statChip(val, label) {
    return el("div", { class: "stat-chip" }, el("b", null, val), el("span", null, label));
  }

  function field(labelText, inputNode, errText) {
    return el("div", { class: "field" },
      el("label", { for: inputNode.id }, labelText),
      inputNode,
      el("div", { class: "err", id: `err_${inputNode.id}` }, errText || "")
    );
  }
  function pwField(id, label, ph) {
    const input = el("input", { class: "input", type: "password", id, placeholder: ph || "••••••••", autocomplete: "new-password" });
    const btn = el("button", { class: "pw-toggle", type: "button", "aria-label": "Show password", html: I("eye") });
    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.innerHTML = I(show ? "eyeOff" : "eye");
    });
    return field(label, el("div", { class: "pw-wrap" }, input, btn));
  }

  function setErr(input, msg) {
    const err = $(`#err_${input.id}`);
    if (err) err.textContent = msg || "";
    input.style.borderColor = msg ? "var(--down)" : "";
    return !msg;
  }

  function render(root, startMode, cb) {
    mode = startMode || "login";
    onSubmit = cb;
    root.classList.remove("hidden");
    root.innerHTML = "";
    root.appendChild(artPanel());
    root.appendChild(el("div", { class: "auth-side" }, card()));
    wire();
  }

  function card() {
    const isLogin = mode === "login";
    return el("div", { class: "auth-card" },
      el("div", { class: "auth-tabs" },
        el("button", { class: `tab ${isLogin ? "active" : ""}`, "data-mode": "login" }, "Log in"),
        el("button", { class: `tab ${!isLogin ? "active" : ""}`, "data-mode": "signup" }, "Sign up")
      ),
      el("h2", null, isLogin ? "Welcome back" : "Create your account"),
      el("p", { class: "lead" }, isLogin ? "Log in to your Star Finance dashboard." : "Start charting your financial constellation in minutes."),

      el("form", { id: "authForm", novalidate: true },
        !isLogin && field("Full name", el("input", { class: "input", id: "f_name", placeholder: "Aurora Lane", autocomplete: "name" })),
        field("Email address", el("input", { class: "input", id: "f_email", type: "email", placeholder: "you@example.com", autocomplete: "email" })),
        pwField("f_pass", "Password", isLogin ? "Your password" : "Min. 8 characters"),
        !isLogin && pwField("f_pass2", "Confirm password"),
        el("div", { class: "err", id: "formErr", style: "min-height:18px; margin-bottom:6px;" }),
        el("button", { class: "btn btn-primary btn-block", type: "submit", id: "submitBtn" }, isLogin ? "Log in" : "Create account")
      ),

      el("div", { class: "auth-alt" },
        isLogin ? "New to Star Finance? " : "Already have an account? ",
        el("button", { type: "button", id: "switchMode" }, isLogin ? "Create an account" : "Log in instead")
      ),

      isLogin && el("button", { class: "btn btn-ghost btn-block", type: "button", id: "demoBtn", style: "margin-top: 10px;", html: `${I("star")} Explore the demo account` }),
      isLogin && el("div", { class: "demo-note", html: `${I("shield")} Demo login — demo@starfinance.app / demo1234` })
    );
  }

  function wire() {
    const root = $("#auth-root");

    $$(".tab", root).forEach((t) => t.addEventListener("click", () => render(root, t.dataset.mode, onSubmit)));
    const switchBtn = $("#switchMode", root);
    if (switchBtn) switchBtn.addEventListener("click", () => render(root, mode === "login" ? "signup" : "login", onSubmit));

    const demoBtn = $("#demoBtn", root);
    if (demoBtn) demoBtn.addEventListener("click", async () => {
      const btn = demoBtn;
      btn.disabled = true;
      try {
        const user = await Store.findByEmail("demo@starfinance.app") ? Store.findByEmail("demo@starfinance.app") : null;
        let u = user;
        if (!u) { u = await Store.createUser("Aurora Lane", "demo@starfinance.app", "demo1234"); }
        if (!(await Store.verifyPassword(u, "demo1234"))) {
          // password was changed by user at some point; recreate canonical demo
          Store.deleteAccount(u.id);
          u = await Store.createUser("Aurora Lane", "demo@starfinance.app", "demo1234");
        }
        toast("Welcome to the Star Finance demo", "success");
        Store.createSession(u.id);
        onSubmit && onSubmit(u);
      } catch (e) {
        toast("Could not start demo", "error");
        btn.disabled = false;
      }
    });

    $("#authForm", root).addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const nameI = $("#f_name"), emailI = $("#f_email"), passI = $("#f_pass"), pass2I = $("#f_pass2");
      const isLogin = mode === "login";
      let ok = true;

      if (!isLogin) ok = setErr(nameI, nameI.value.trim().length >= 2 ? "" : "Please enter your name.") && ok;
      ok = setErr(emailI, EMAIL_RE.test(emailI.value.trim()) ? "" : "Enter a valid email address.") && ok;
      ok = setErr(passI, passI.value.length >= (isLogin ? 1 : 8) ? "" : isLogin ? "Enter your password." : "Use at least 8 characters.") && ok;
      if (!isLogin) ok = setErr(pass2I, pass2I.value === passI.value ? "" : "Passwords do not match.") && ok;
      if (!ok) return;

      const btn = $("#submitBtn");
      btn.disabled = true;
      btn.textContent = isLogin ? "Logging in…" : "Creating account…";
      $("#formErr").textContent = "";

      try {
        if (isLogin) {
          const u = Store.findByEmail(emailI.value);
          if (!u || !(await Store.verifyPassword(u, passI.value))) {
            $("#formErr").textContent = "Incorrect email or password.";
            btn.disabled = false; btn.textContent = "Log in";
            return;
          }
          Store.createSession(u.id);
          toast(`Welcome back, ${u.name.split(" ")[0]}`, "success");
          onSubmit && onSubmit(u);
        } else {
          if (Store.findByEmail(emailI.value)) {
            $("#formErr").textContent = "An account with this email already exists.";
            btn.disabled = false; btn.textContent = "Create account";
            return;
          }
          const u = await Store.createUser(nameI.value, emailI.value, passI.value);
          Store.createSession(u.id);
          toast("Account created — welcome aboard", "success");
          onSubmit && onSubmit(u);
        }
      } catch (e) {
        $("#formErr").textContent = "Something went wrong. Please try again.";
        btn.disabled = false; btn.textContent = isLogin ? "Log in" : "Create account";
      }
    });

    const first = $("#f_name") || $("#f_email");
    if (first) first.focus();
  }

  return { render };
})();
