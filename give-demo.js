// Donate page: a demo of giving online. Nothing is sent anywhere and no money is taken.
// When it goes live, the Pay step hands over to Stripe instead of showing the thank-you.
(function () {
  var box = document.getElementById("give");
  var choose = document.getElementById("give-choose");
  if (!box || !choose) return;
  var pay = document.getElementById("give-pay");
  var done = document.getElementById("give-done");
  var title = document.getElementById("give-title");
  var aidBox = choose.querySelector(".give-aid-details");
  var other = choose.elements.other;

  function money(n) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency", currency: "GBP", minimumFractionDigits: n % 1 ? 2 : 0
    }).format(n);
  }
  function amount() {
    var typed = parseFloat(other.value);
    return typed > 0 ? typed : parseFloat(choose.elements.amount.value) || 0;
  }
  function monthly() {
    return choose.elements.often.value === "month";
  }
  function gift() {
    return money(amount()) + (monthly() ? " a month" : "");
  }
  function update() {
    var aid = choose.elements.aid.checked;
    choose.querySelector("[data-give]").textContent = "Give " + gift();
    choose.querySelector("[data-aid]").textContent = money(amount() * 0.25);
    aidBox.hidden = !aid;
    ["name", "address", "postcode"].forEach(function (n) { choose.elements[n].required = aid; });
  }
  function show(step) {
    [choose, pay, done].forEach(function (s) { s.hidden = s !== step; });
    title.focus();
  }

  choose.addEventListener("input", function (e) {
    if (e.target === other) choose.querySelectorAll("[name=amount]").forEach(function (r) { r.checked = false; });
    if (e.target.name === "amount") other.value = "";
    other.setCustomValidity("");
    update();
  });
  choose.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!amount()) {
      other.setCustomValidity("Choose an amount or type one in.");
      other.reportValidity();
      return;
    }
    var aid = choose.elements.aid.checked;
    pay.querySelector("[data-summary]").textContent = gift() + " to St Michael's" +
      (aid ? ", plus " + money(amount() * 0.25) + " Gift Aid from HMRC." : ".");
    pay.querySelector("[data-pay]").textContent = monthly() ? "Start " + gift() : "Pay " + gift();
    show(pay);
  });
  pay.addEventListener("submit", function (e) {
    e.preventDefault();
    done.querySelector("[data-thanks]").textContent = "Your gift of " + gift() + " helps keep St Michael's open for everyone.";
    show(done);
  });
  pay.querySelector(".give-back").addEventListener("click", function () { show(choose); });
  done.querySelector("[data-again]").addEventListener("click", function () {
    choose.reset();
    pay.reset();
    update();
    show(choose);
  });

  // The home page's "Give monthly" and "Give once" buttons land here with the right choice made
  if (location.hash === "#once") {
    choose.elements.often.value = "once";
    box.scrollIntoView();
  }
  choose.hidden = false;
  update();
})();
