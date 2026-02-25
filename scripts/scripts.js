$(document).ready(function () {
  $("#locations-list").html(`
  <div class="d-flex justify-content-center align-items-center h-100">
    <div class="spinner-border text-secondary" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
  </div>
`);
  $.ajax({
    method: "GET",
    url: "https://my.api.mockaroo.com/locations.json?key=fcd8edc0",
    dataType: "json",
  })
    .done(function (response) {
      const userLat = 34.0549;
      const userLng = -118.2426;

      // simulating user filter
      const selectedPostalCode = "90040";

      const filteredLocations = response.filter(
        (location) => location.postal_code === selectedPostalCode,
      );

      filteredLocations.forEach((location) => {
        location.phone = generateRandomPhone();

        location.distance = calculateDistance(
          userLat,
          userLng,
          parseFloat(location.latitude),
          parseFloat(location.longitude),
        );
      });

      filteredLocations.sort((a, b) => a.distance - b.distance);

      renderLocations(filteredLocations);
      updateHeader(filteredLocations);
    })
    .fail(function (error) {
      $("#locations-list").html(`
        <div class="text-center p-4 text-danger">
          <p>Unable to load taco trucks. Please refresh the page.</p>
        </div>
      `);
    });

  // Mobile toggle

  $("#show-list").on("click", function () {
    if (window.innerWidth <= 768) {
      $(".locations").removeClass("d-none");
      $(".map").addClass("d-none");
    }

    $("#show-map").removeClass("active-toggle");
    $(this).addClass("active-toggle");
  });

  $("#show-map").on("click", function () {
    $("#show-list").removeClass("active-toggle");
    $(this).addClass("active-toggle");
  });
});

function showMapMobile() {
  if (window.innerWidth <= 768) {
    $(".locations").addClass("d-none");
    $(".map").removeClass("d-none");
    $("#show-list").removeClass("active-toggle");
    $("#show-map").addClass("active-toggle");
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  //Haversine formula
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 3958.8;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getTodayStatus(location) {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  const todayIndex = new Date().getDay();
  const todayKey = days[todayIndex];

  const open = location[`${todayKey}_open`];
  const close = location[`${todayKey}_close`];

  if (!open || open === "Closed") {
    return "Closed today";
  }

  const now = new Date();

  const parseTime = (timeStr) => {
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier === "PM" && hours !== 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    return new Date(1970, 0, 1, hours, minutes);
  };

  const openDate = parseTime(open);
  const closeDate = parseTime(close);

  const current = new Date(1970, 0, 1, now.getHours(), now.getMinutes());

  if (current < openDate || current > closeDate) {
    return "Closed now";
  }

  return `Open today until ${close}`;
}

function updateHeader(locations) {
  const count = locations.length;
  const postalCode = locations[0]?.postal_code || "";

  $("#trucks-count").text(`Found ${count} Taco Trucks in ${postalCode}`);
}

function generateRandomPhone() {
  const randomDigit = () => Math.floor(Math.random() * 10);

  const first = Array.from({ length: 3 }, randomDigit).join("");
  const second = Array.from({ length: 3 }, randomDigit).join("");
  const third = Array.from({ length: 4 }, randomDigit).join("");

  return `${first}-${second}-${third}`;
}

function renderLocations(locations) {
  const container = $("#locations-list");
  container.empty();

  locations.forEach(function (location) {
    const phone = `<img src="assets/phone-icon.png" /> ${location.phone}`;

    const card = $(`
      <div class="truck-card">
          <div class="card-title">
              <h5>${location.name}</h5>
              <p>${location.distance.toFixed(1)} miles</p>
          </div>
          <p>${location.address}</p>
          <p>${location.city}, ${location.state} ${location.postal_code}</p>
          <p class="open-hours">${getTodayStatus(location)}</p>
          <p class="orange-text">${phone}</p>
          <div class="buttons">
              <button class="primary-btn directions-btn">Directions</button>
              <button class="primary-btn info-btn">More Info</button>
          </div>
      </div>
    `);

    card.on("click", function () {
      activateCard(card, location);

      if ($("#info-modal").is(":visible")) {
        openModal(location);
      }

      // Mobile
      showMapMobile();
    });

    card.find(".directions-btn").on("click", function (e) {
      e.stopPropagation();

      activateCard(card, location);

      openDirections(location);
    });

    card.find(".info-btn").on("click", function (e) {
      e.stopPropagation();

      activateCard(card, location);
      openModal(location);

      showMapMobile();
    });

    container.append(card);
  });
}

$(document).on("click", function (e) {
  if (window.innerWidth <= 768) return;
  const clickedInsideCard = $(e.target).closest(".truck-card").length > 0;
  const clickedInsideMap = $(e.target).closest(".map").length > 0;
  const clickedModal = $(e.target).closest(".modal-overlay").length > 0;

  if (!clickedInsideCard && !clickedInsideMap && !clickedModal) {
    $(".truck-card").removeClass("active-card");
    $("#map-image").hide().attr("src", "");
    $("#map-placeholder").show();
    $("#info-modal").fadeOut(200);
  }
});

function activateCard(card, location) {
  $(".truck-card").removeClass("active-card");
  card.addClass("active-card");
  renderMap(location);
}

function renderMap(location) {
  const lat = location.latitude;
  const lng = location.longitude;

  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=13&scale=2&size=800x600&maptype=roadmap&format=png&visual_refresh=true&markers=size:small%7Ccolor:0xff0000%7C${lat},${lng}&key=AIzaSyCAJz__098vTeQTMMWL6nARxZhvaK9pcsg`;

  $("#map-image").attr("src", mapUrl).show();

  $("#map-placeholder").hide();
}

function openModal(location) {
  const modalBody = $("#modal-body");

  const todayIndex = new Date().getDay();
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  let hoursHTML = "";

  dayNames.forEach((day, index) => {
    const key = day.toLowerCase();
    const open = location[`${key}_open`];
    const close = location[`${key}_close`];

    let text = !open || open === "Closed" ? "Closed" : `${open} - ${close}`;

    const isToday = index === todayIndex;

    hoursHTML += `
      <div class="row hours-row ${isToday ? "today-row" : ""}">
        <div class="col-5"><p>${day}</p></div>
        <div class="col-7"><p>${text}</p></div>
      </div>
    `;
  });

  modalBody.html(`
    <img src="assets/img-placeholder.png" class="modal-image" />
    <div class="info-address">
        <h4>${location.name}</h4>
        <p>${location.address}</p>
        <p>${location.city}, ${location.state} ${location.postal_code}</p>
        <div class="info-contact">
            <p class="orange-text">
              <img src="assets/phone-icon.png" /> ${location.phone}
            </p>
            <p>
              <a href="#" class="orange-text get-directions-link">
                <img src="assets/direction-icon.png" /> Get Directions
              </a>
            </p>
        </div>
    </div>

    <div class="hours">
      ${hoursHTML}
    </div>

    <button id="view-full" class="primary-btn">View Full Details</button>
  `);

  $("#info-modal").fadeIn(200).css("display", "flex");

  $("#view-full").on("click", function () {
    window.open(location.url, "_blank");
  });

  $(".get-directions-link").on("click", function (e) {
    e.preventDefault();
    openDirections(location);
  });

  $("#close-modal").on("click", function () {
    $("#info-modal").fadeOut(200);
  });

  $(window)
    .off("click.modal")
    .on("click.modal", function (e) {
      if ($(e.target).is("#info-modal")) {
        $("#info-modal").fadeOut(200);
      }
    });
}

function openDirections(location) {
  const lat = location.latitude;
  const lng = location.longitude;
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  window.open(googleUrl, "_blank");
}
