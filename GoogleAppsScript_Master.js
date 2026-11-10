/**
 * RETOUCHER SHOAIB® — CLOUD DRIVE DATABASE & STUDIO AUTOMATION BACKEND
 * Master Google Drive Root Folder ID: 1HbpZXTf0jQcDy4VyjRYKUmHyFQ3kHFhc
 * Webhook URL: https://script.google.com/macros/s/AKfycbyFQyV8BmfMGWDd3rv3I-chTT6iIn7TH5GqCev_0_SHHOmueYZznGPCiOcO5Q7AA5QHhg/exec
 */

var ROOT_FOLDER_ID = "1HbpZXTf0jQcDy4VyjRYKUmHyFQ3kHFhc";
var DB_FILE_NAME = "shoaib_database.json";

// 1. DATABASE HELPERS (PERSISTENT CLOUD STORAGE IN GOOGLE DRIVE)
function getOrCreateDatabaseFile(rootFolder) {
  var files = rootFolder.getFilesByName(DB_FILE_NAME);
  if (files.hasNext()) {
    return files.next();
  } else {
    var initial = {
      status: "success",
      orders: [],
      users: {},
      statuses: {},
      deliveries: {},
      extraWork: {},
      paidStatuses: {},
      paymentClaims: {}
    };
    return rootFolder.createFile(DB_FILE_NAME, JSON.stringify(initial, null, 2), "application/json");
  }
}

function normalizeGasId(raw) {
  if (!raw) return '';
  var str = String(raw).trim().replace(/#?RS-?2026-?/i, '').replace(/#?RS-?/i, '').replace('#', '');
  if (str.indexOf('2026') === 0 && str.length > 5) {
    str = str.substring(4);
  }
  return str.replace(/[^0-9]/g, '');
}

function getDatabase(rootFolder) {
  try {
    var file = getOrCreateDatabaseFile(rootFolder);
    var content = file.getBlob().getDataAsString();
    if (!content || content.trim().length === 0) {
      return { status: "success", orders: [], users: {}, statuses: {}, deliveries: {}, extraWork: {}, paidStatuses: {}, paymentClaims: {}, deletedOrders: {}, agreedPrices: {} };
    }
    var db = JSON.parse(content);
    if (!db.orders || !Array.isArray(db.orders)) db.orders = [];
    if (!db.users || typeof db.users !== "object") db.users = {};
    if (!db.statuses || typeof db.statuses !== "object") db.statuses = {};
    if (!db.deliveries || typeof db.deliveries !== "object") db.deliveries = {};
    if (!db.extraWork || typeof db.extraWork !== "object") db.extraWork = {};
    if (!db.paidStatuses || typeof db.paidStatuses !== "object") db.paidStatuses = {};
    if (!db.paymentClaims || typeof db.paymentClaims !== "object") db.paymentClaims = {};
    if (!db.deletedOrders || typeof db.deletedOrders !== "object") db.deletedOrders = {};
    if (!db.agreedPrices || typeof db.agreedPrices !== "object") db.agreedPrices = {};

    // Auto-heal orders: normalize ID, sync isPaid and isAgreed
    for (var k = 0; k < db.orders.length; k++) {
      var ord = db.orders[k];
      if (ord) {
        var cleanNum = normalizeGasId(ord.numericId || ord.id);
        if (cleanNum) {
          ord.numericId = cleanNum;
          ord.id = "#" + cleanNum;
        }
        var isMarkedPaid = db.paidStatuses && (db.paidStatuses[cleanNum] || db.paidStatuses["#" + cleanNum] || db.paidStatuses["RS-2026-" + cleanNum] || db.paidStatuses["#RS-2026-" + cleanNum]);
        if (isMarkedPaid) {
          ord.isPaid = true;
          ord.isAgreed = true;
        } else {
          ord.isPaid = false;
        }
        if (db.statuses && (db.statuses[cleanNum] || db.statuses["#" + cleanNum])) {
          ord.status = db.statuses[cleanNum] || db.statuses["#" + cleanNum];
        }
        var agreedVal = db.agreedPrices && (
          (typeof db.agreedPrices[cleanNum] === 'string' && db.agreedPrices[cleanNum]) ||
          (typeof db.agreedPrices["#" + cleanNum] === 'string' && db.agreedPrices["#" + cleanNum]) ||
          (typeof db.agreedPrices["RS-2026-" + cleanNum] === 'string' && db.agreedPrices["RS-2026-" + cleanNum]) ||
          (typeof db.agreedPrices["#RS-2026-" + cleanNum] === 'string' && db.agreedPrices["#RS-2026-" + cleanNum]) ||
          db.agreedPrices[cleanNum] || db.agreedPrices["#" + cleanNum] || db.agreedPrices["RS-2026-" + cleanNum]
        );
        if (agreedVal) {
          ord.isAgreed = true;
          if (typeof agreedVal === 'string') ord.price = agreedVal;
        }
      }
    }

    db.status = "success";
    return db;
  } catch(e) {
    return { status: "success", orders: [], users: {}, statuses: {}, deliveries: {}, extraWork: {}, paidStatuses: {}, paymentClaims: {}, deletedOrders: {}, agreedPrices: {} };
  }
}

function saveDatabase(rootFolder, db) {
  try {
    var file = getOrCreateDatabaseFile(rootFolder);
    file.setContent(JSON.stringify(db, null, 2));
  } catch(e) {
    console.error("Error saving database file:", e);
  }
}

// 2. GET REQUEST HANDLER (CLOUD DATA SYNC FOR ADMIN & CLIENT PORTAL)
function doGet(e) {
  try {
    var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
    
    if (action === "get_database") {
      var db = getDatabase(rootFolder);
      return ContentService.createTextOutput(JSON.stringify(db))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput("Retoucher Shoaib Secure Drive & Mail Automation is Active! Action: " + action);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 3. POST REQUEST HANDLER (ACTIONS, ORDER CREATION & TWO-WAY SYNC)

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    
    if (data.action === "get_database") {
      var db = getDatabase(rootFolder);
      return ContentService.createTextOutput(JSON.stringify(db))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // (A) ক্লায়েন্ট ফোল্ডার তৈরি বা রিটার্ন করা
    if (data.action === "create_client_folder") {
      var email = data.email.toLowerCase().trim();
      var clientFolder;
      var existingFolders = rootFolder.getFoldersByName(email);
      if (existingFolders.hasNext()) {
        clientFolder = existingFolders.next();
      } else {
        clientFolder = rootFolder.createFolder(email);
      }
      
      try {
        clientFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
      } catch(errShare) {}

      // ক্লায়েন্ট ইনফো ক্লাউড ডাটাবেজে স্টোর
      if (data.user) {
        var lock = LockService.getScriptLock();
        lock.tryLock(10000);
        try {
          var db = getDatabase(rootFolder);
          db.users[email] = data.user;
          saveDatabase(rootFolder, db);
        } finally {
          lock.releaseLock();
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        folderId: clientFolder.getId(),
        folderUrl: clientFolder.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // (B) নতুন ক্লায়েন্ট রেজিস্ট্রেশন ক্লাউড ডাটাবেজে সেভ করা
    if (data.action === "register_user") {
      if (data.user && data.user.email) {
        var uEmail = data.user.email.toLowerCase().trim();
        var lock = LockService.getScriptLock();
        lock.tryLock(10000);
        try {
          var db = getDatabase(rootFolder);
          db.users[uEmail] = data.user;
          saveDatabase(rootFolder, db);
        } finally {
          lock.releaseLock();
        }

        // ক্লায়েন্টের ড্রাইভ ফোল্ডার নিশ্চিত করা
        var fExists = rootFolder.getFoldersByName(uEmail);
        if (!fExists.hasNext()) {
          var createdF = rootFolder.createFolder(uEmail);
          try { createdF.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT); } catch(s) {}
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // (C) নতুন অর্ডার ড্রাইভ ফোল্ডার তৈরি + ক্লাউড ডাটাবেজে সেভ + ইমেইল নোটিফিকেশন
    if (data.action === "create_order_folder") {
      var email = data.email.toLowerCase().trim();
      var orderId = normalizeGasId(data.orderId || (data.orderData ? data.orderData.numericId : ""));
      var clientFolders = rootFolder.getFoldersByName(email);
      var clientFolder = clientFolders.hasNext() ? clientFolders.next() : rootFolder.createFolder(email);
      
      try {
        clientFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
      } catch(errShare) {}
      
      var orderFolderName = "Order #" + orderId;
      var orderFolder;
      var existingOrderFolders = clientFolder.getFoldersByName(orderFolderName);
      if (existingOrderFolders.hasNext()) {
        orderFolder = existingOrderFolders.next();
      } else {
        orderFolder = clientFolder.createFolder(orderFolderName);
      }
      
      try {
        orderFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
      } catch(errShare) {}
      
      var orderUrl = orderFolder.getUrl();

      // অর্ডার অবজেক্ট ক্লাউড ডাটাবেজে পার্মানেন্টলি সেভ করা
      var orderObj = data.orderData || {};
      orderObj.id = "#" + orderId;
      orderObj.numericId = orderId;
      if (!orderObj.title) orderObj.title = data.projectTitle || "Commercial Project";
      if (!orderObj.service) orderObj.service = data.service || "Commercial Retouching";
      if (!orderObj.images) orderObj.images = data.images || "RAW files";
      if (!orderObj.deadline) orderObj.deadline = data.deadline || "Express SLA";
      if (!orderObj.price) orderObj.price = data.price || "$0.00 USD";
      if (!orderObj.clientName) orderObj.clientName = data.clientName || "Studio Client";
      if (!orderObj.clientEmail) orderObj.clientEmail = email;
      if (!orderObj.clientCompany) orderObj.clientCompany = data.clientCompany || "Studio";
      if (!orderObj.status) orderObj.status = "pending";
      if (!orderObj.instructions) orderObj.instructions = data.instructions || "";
      if (!orderObj.createdAt) orderObj.createdAt = Utilities.formatDate(new Date(), "GMT", "MMM dd, yyyy");
      orderObj.drive = orderUrl;
      orderObj.orderFolder = "Order #" + orderId;

      var lock = LockService.getScriptLock();
      lock.tryLock(10000);
      try {
        var db = getDatabase(rootFolder);
        var matchIdx = -1;
        for (var i = 0; i < db.orders.length; i++) {
          if (normalizeGasId(db.orders[i].numericId || db.orders[i].id) === orderId) {
            matchIdx = i;
            break;
          }
        }
        if (matchIdx >= 0) {
          db.orders[matchIdx] = orderObj;
        } else {
          db.orders.unshift(orderObj);
        }
        saveDatabase(rootFolder, db);
      } finally {
        lock.releaseLock();
      }

      // (ক) শোয়েবকে তাৎক্ষণিক অর্ডার নোটিফিকেশন পাঠানো
      try {
        var adminEmails = ["retouchershoaib@gmail.com", "s.siddique.me@gmail.com"];
        var adminSubject = "🔔 New Commercial Order: Order #" + orderId + " (" + (data.clientName || email) + ")";
        var adminBody = "A new retouching order has been submitted on Retoucher Shoaib Studio Portal.\n\n" +
          "═════════════════════════════════════════════\n" +
          "ORDER DETAILS\n" +
          "═════════════════════════════════════════════\n" +
          "• Order ID: #" + orderId + "\n" +
          "• Project: " + (data.projectTitle || "Commercial Project") + "\n" +
          "• Client Name: " + (data.clientName || "Studio Client") + "\n" +
          "• Client Email: " + email + "\n" +
          "• Company/Agency: " + (data.clientCompany || "Studio") + "\n" +
          "• Service Department: " + (data.service || "Commercial Retouching") + "\n" +
          "• Files & Deliverables: " + (data.images || "RAW files") + "\n" +
          "• Turnaround SLA: " + (data.deadline || "Express SLA") + "\n" +
          "• Budget / Price: " + (data.price || "Commercial Rate") + "\n\n" +
          "═════════════════════════════════════════════\n" +
          "CREATIVE BRIEF & INSTRUCTIONS\n" +
          "═════════════════════════════════════════════\n" +
          (data.instructions || "No custom brief provided.") + "\n\n" +
          "═════════════════════════════════════════════\n" +
          "GOOGLE DRIVE ORDER FOLDER\n" +
          "═════════════════════════════════════════════\n" +
          orderUrl + "\n\n" +
          "Open Studio Admin Console:\n" +
          "https://retouchershoaib.com/admin\n";

        MailApp.sendEmail({
          to: adminEmails[0],
          cc: adminEmails[1],
          subject: adminSubject,
          body: adminBody,
          name: "Retoucher Shoaib Portal"
        });
      } catch(errMailAdmin) {
        console.error("Admin notification error:", errMailAdmin);
      }

      // (খ) ক্লায়েন্টকে পেশাদার কনফার্মেশন ইমেইল পাঠানো
      try {
        if (email && email.indexOf("@") !== -1) {
          var clientSubject = "Order Confirmation: Order #" + orderId + " — Retoucher Shoaib® Studio";
          var clientBody = "Dear " + (data.clientName || "Valued Client") + ",\n\n" +
            "Thank you for choosing Retoucher Shoaib Studio. We have successfully received your project specifications and files.\n\n" +
            "─────────────────────────────────────────────\n" +
            "PROJECT SUMMARY\n" +
            "─────────────────────────────────────────────\n" +
            "• Order ID: #" + orderId + "\n" +
            "• Project Title: " + (data.projectTitle || "Commercial Post-Production") + "\n" +
            "• Service Department: " + (data.service || "High-End Retouching") + "\n" +
            "• Deliverables: " + (data.images || "16-bit Master PSD + WebP") + "\n" +
            "• SLA Turnaround: " + (data.deadline || "Express SLA") + "\n" +
            "• Agreed / Proposed Budget: " + (data.price || "$0.00 USD") + "\n\n" +
            "─────────────────────────────────────────────\n" +
            "CREATIVE BRIEF\n" +
            "─────────────────────────────────────────────\n" +
            "\"" + (data.instructions || "Standard high-end commercial retouching.") + "\"\n\n" +
            "─────────────────────────────────────────────\n" +
            "YOUR DEDICATED GOOGLE DRIVE FOLDER\n" +
            "─────────────────────────────────────────────\n" +
            orderUrl + "\n\n" +
            "Our senior post-production team has begun inspecting your files and establishing display color calibration. You can track real-time stage progress and live SLA countdown anytime directly on your private portal:\n" +
            "https://retouchershoaib.com/portal\n\n" +
            "If you have additional references or questions, feel free to reply directly to this email or contact us on WhatsApp at +880 1710 763251.\n\n" +
            "Warm regards,\n\n" +
            "Shoaib Siddique\n" +
            "High-End Commercial Retoucher & Creative Director\n" +
            "Retoucher Shoaib® | Commercial Post-Production Studio\n" +
            "https://retouchershoaib.com\n";

          MailApp.sendEmail({
            to: email,
            subject: clientSubject,
            body: clientBody,
            name: "Shoaib Siddique (Retoucher Shoaib®)",
            replyTo: "s.siddique.me@gmail.com"
          });
        }
      } catch(errMailClient) {
        console.error("Client confirmation error:", errMailClient);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        orderFolderId: orderFolder.getId(),
        orderFolderUrl: orderUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // (D) ড্রপ করা ফাইল সরাসরি গুগল ড্রাইভে আপলোড
    if (data.action === "upload_file_to_order") {
      var orderFolderId = data.orderFolderId;
      var orderFolder = DriveApp.getFolderById(orderFolderId);
      var decoded = Utilities.base64Decode(data.base64);
      var blob = Utilities.newBlob(decoded, data.mimeType || "application/octet-stream", data.fileName || "uploaded_image");
      var file = orderFolder.createFile(blob);
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
      } catch(errShare) {}

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        fileId: file.getId(),
        fileUrl: file.getUrl(),
        fileName: file.getName()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // (E1) পেমেন্ট ক্লেইম সাবমিট (Client -> Cloud)
    if (data.action === "claim_payment") {
      var rawId = String(data.numericId || "");
      var cleanNum = normalizeGasId(rawId);
      var ref = String(data.ref || "").trim();
      var lock = LockService.getScriptLock();
      lock.tryLock(10000);
      var claimObj = null;
      try {
        var db = getDatabase(rootFolder);
        if (!db.paymentClaims) db.paymentClaims = {};
        claimObj = {
          ref: ref,
          orderId: cleanNum || rawId,
          amount: Number(data.amount || 0),
          clientName: data.clientName || "",
          clientEmail: data.clientEmail || "",
          time: data.time || "",
          date: data.date || ""
        };
        db.paymentClaims[rawId] = claimObj;
        if (cleanNum) {
          db.paymentClaims[cleanNum] = claimObj;
          db.paymentClaims["#" + cleanNum] = claimObj;
          db.paymentClaims["RS-2026-" + cleanNum] = claimObj;
          db.paymentClaims["#RS-2026-" + cleanNum] = claimObj;
        }
        saveDatabase(rootFolder, db);
      } finally {
        lock.releaseLock();
      }

      // (ক) শোয়েবকে তাৎক্ষণিক পেমেন্ট ভেরিফিকেশন ইমেইল অ্যালার্ট পাঠানো
      try {
        var adminEmails = ["retouchershoaib@gmail.com", "s.siddique.me@gmail.com"];
        var adminSubject = "💳 Payment Claim Submitted: Order #" + (cleanNum || rawId) + " ($" + Number(data.amount || 0).toFixed(2) + " USD) - " + (data.clientName || "Studio Client");
        var adminBody = "A client has submitted payment transfer confirmation on Retoucher Shoaib Studio Portal.\n\n" +
          "═════════════════════════════════════════════\n" +
          "PAYMENT CLAIM DETAILS\n" +
          "═════════════════════════════════════════════\n" +
          "• Order ID: #RS-2026-" + (cleanNum || rawId) + "\n" +
          "• Client Name: " + (data.clientName || "Studio Client") + "\n" +
          "• Client Email: " + (data.clientEmail || "Not provided") + "\n" +
          "• Claimed Amount: $" + Number(data.amount || 0).toFixed(2) + " USD\n" +
          "• Transfer Reference / TX: #" + ref + "\n" +
          "• Submission Timestamp: " + (data.time || "") + " " + (data.date || "") + "\n\n" +
          "═════════════════════════════════════════════\n" +
          "ACTION IN STUDIO ADMIN CONSOLE\n" +
          "═════════════════════════════════════════════\n" +
          "1. Check your Wise or Bank account for reference #" + ref + ".\n" +
          "2. Open Admin Console:\n" +
          "   https://retouchershoaib.com/admin\n" +
          "3. In '⚡ Incoming Payment Claims', click [ Review & Mark Paid ] to confirm.\n" +
          "   This will instantly mark the client invoice as PAID ✓ and issue their official receipt.\n";

        MailApp.sendEmail({
          to: adminEmails[0],
          cc: adminEmails[1],
          subject: adminSubject,
          body: adminBody,
          name: "Retoucher Shoaib Billing Desk"
        });
      } catch(errMailAdmin) {
        console.error("Admin payment notification error:", errMailAdmin);
      }

      // (খ) ক্লায়েন্টকে প্রাপ্তিস্বীকার ইমেইল পাঠানো
      try {
        var clientEmail = data.clientEmail || "";
        if (clientEmail && clientEmail.indexOf("@") !== -1) {
          var clientSubject = "⏳ Payment Verification in Progress: Order #RS-2026-" + (cleanNum || rawId);
          var clientBody = "Dear " + (data.clientName || "Valued Client") + ",\n\n" +
            "Thank you! We have received your payment transfer confirmation (Ref #" + ref + ") for Order #RS-2026-" + (cleanNum || rawId) + ".\n\n" +
            "Studio Director Shoaib Siddique is verifying the funds with bank records. Once verified, your status will update to PAID ✓ and your certified tax invoice receipt will be available for download.\n\n" +
            "Check live status anytime:\n" +
            "https://retouchershoaib.com/portal\n\n" +
            "Warm regards,\n" +
            "Retoucher Shoaib Studio\n" +
            "https://retouchershoaib.com\n";

          MailApp.sendEmail({
            to: clientEmail,
            subject: clientSubject,
            body: clientBody,
            name: "Retoucher Shoaib Studio",
            replyTo: "s.siddique.me@gmail.com"
          });
        }
      } catch(errMailCl) {
        console.error("Client claim acknowledgement error:", errMailCl);
      }

      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // (E2) অর্ডার পেইড মার্ক করা (Admin -> Cloud)
    if (data.action === "mark_order_paid") {
      var rawId = String(data.numericId || "");
      var cleanNum = normalizeGasId(rawId);
      var lock = LockService.getScriptLock();
      lock.tryLock(10000);
      var clientEmail = "";
      var clientName = "";
      var orderTitle = "Commercial Retouching";
      try {
        var db = getDatabase(rootFolder);
        if (!db.paidStatuses) db.paidStatuses = {};
        db.paidStatuses[rawId] = true;
        if (cleanNum) {
          db.paidStatuses[cleanNum] = true;
          db.paidStatuses["#" + cleanNum] = true;
          db.paidStatuses["RS-2026-" + cleanNum] = true;
          db.paidStatuses["#RS-2026-" + cleanNum] = true;
        }

        // ক্লেইম লিস্ট থেকে এই অর্ডার সফলভাবে পেইড হওয়ায় ক্লিয়ার করা
        if (db.paymentClaims) {
          delete db.paymentClaims[rawId];
          if (cleanNum) {
            delete db.paymentClaims[cleanNum];
            delete db.paymentClaims["#" + cleanNum];
            delete db.paymentClaims["RS-2026-" + cleanNum];
            delete db.paymentClaims["#RS-2026-" + cleanNum];
            Object.keys(db.paymentClaims).forEach(function(k) {
              if (normalizeGasId(k) === cleanNum) {
                delete db.paymentClaims[k];
              }
            });
          }
        }

        for (var i = 0; i < db.orders.length; i++) {
          var oNum = normalizeGasId(db.orders[i].numericId || db.orders[i].id || "");
          if (oNum === cleanNum || String(db.orders[i].numericId) === rawId || String(db.orders[i].id) === rawId) {
            db.orders[i].isPaid = true;
            clientEmail = db.orders[i].clientEmail || db.orders[i].email || "";
            clientName = db.orders[i].clientName || "";
            orderTitle = db.orders[i].projectTitle || db.orders[i].title || "Commercial Retouching";
            break;
          }
        }
        saveDatabase(rootFolder, db);
      } finally {
        lock.releaseLock();
      }

      // ক্লায়েন্টকে পেইড ট্যাক্স রিসিট কনফার্মেশন ইমেইল পাঠানো
      try {
        if (clientEmail && clientEmail.indexOf("@") !== -1) {
          var paidSubject = "✓ Payment Received & Official Receipt Issued: Order #" + (cleanNum || rawId);
          var paidBody = "Dear " + (clientName || "Valued Client") + ",\n\n" +
            "Thank you! Your payment for Order #" + (cleanNum || rawId) + " (" + orderTitle + ") has been verified and marked as PAID ✓.\n\n" +
            "═════════════════════════════════════════════\n" +
            "OFFICIAL PAYMENT RECEIPT\n" +
            "═════════════════════════════════════════════\n" +
            "• Order ID: #" + (cleanNum || rawId) + "\n" +
            "• Status: PAID ✓ (All settled)\n" +
            "• Studio: Retoucher Shoaib High-End Commercial Post-Production\n\n" +
            "Your official printable tax invoice & receipt is ready in your Client Portal:\n" +
            "https://retouchershoaib.com/portal\n\n" +
            "Warm regards,\n" +
            "Retoucher Shoaib Billing Desk\n" +
            "https://retouchershoaib.com\n";

          MailApp.sendEmail({
            to: clientEmail,
            subject: paidSubject,
            body: paidBody,
            name: "Retoucher Shoaib Studio",
            replyTo: "s.siddique.me@gmail.com"
          });
        }
      } catch(errMailPaid) {
        console.error("Client paid receipt email error:", errMailPaid);
      }

      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // (E3) অর্ডার রিভার্ট করে আনপেইড করা (Admin -> Cloud Revert to Unpaid)
    if (data.action === "mark_order_unpaid") {
      var rawId = String(data.numericId || "");
      var cleanNum = normalizeGasId(rawId);
      var lock = LockService.getScriptLock();
      lock.tryLock(10000);
      try {
        var db = getDatabase(rootFolder);
        if (db.paidStatuses) {
          delete db.paidStatuses[rawId];
          if (cleanNum) {
            delete db.paidStatuses[cleanNum];
            delete db.paidStatuses["#" + cleanNum];
            delete db.paidStatuses["RS-2026-" + cleanNum];
            delete db.paidStatuses["#RS-2026-" + cleanNum];
            Object.keys(db.paidStatuses).forEach(function(k) {
              if (normalizeGasId(k) === cleanNum) {
                delete db.paidStatuses[k];
              }
            });
          }
        }
        if (db.paymentClaims) {
          delete db.paymentClaims[rawId];
          if (cleanNum) {
            delete db.paymentClaims[cleanNum];
            delete db.paymentClaims["#" + cleanNum];
            delete db.paymentClaims["RS-2026-" + cleanNum];
            delete db.paymentClaims["#RS-2026-" + cleanNum];
            Object.keys(db.paymentClaims).forEach(function(k) {
              if (normalizeGasId(k) === cleanNum) {
                delete db.paymentClaims[k];
              }
            });
          }
        }
        for (var i = 0; i < db.orders.length; i++) {
          var oNum = normalizeGasId(db.orders[i].numericId || db.orders[i].id || "");
          if (oNum === cleanNum || String(db.orders[i].numericId) === rawId) {
            db.orders[i].isPaid = false;
            break;
          }
        }
        saveDatabase(rootFolder, db);
      } finally {
        lock.releaseLock();
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // (E4) পেমেন্ট ক্লেইম ক্লিয়ার / রিজেক্ট করা (Admin -> Cloud Clear Claim)
    if (data.action === "clear_payment_claim") {
      var rawId = String(data.numericId || "");
      var cleanNum = normalizeGasId(rawId);
      var lock = LockService.getScriptLock();
      lock.tryLock(10000);
      try {
        var db = getDatabase(rootFolder);
        if (db.paymentClaims) {
          delete db.paymentClaims[rawId];
          if (cleanNum) {
            delete db.paymentClaims[cleanNum];
            delete db.paymentClaims["#" + cleanNum];
            delete db.paymentClaims["RS-2026-" + cleanNum];
            delete db.paymentClaims["#RS-2026-" + cleanNum];
            Object.keys(db.paymentClaims).forEach(function(k) {
              if (normalizeGasId(k) === cleanNum) {
                delete db.paymentClaims[k];
              }
            });
          }
        }
        saveDatabase(rootFolder, db);
      } finally {
        lock.releaseLock();
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // (E) অর্ডার স্ট্যাটাস আপডেট (Admin -> Cloud)
    if (data.action === "update_order_status") {
      var rawId = String(data.numericId || "");
      var cleanNum = normalizeGasId(rawId);
      var lock = LockService.getScriptLock();
      lock.tryLock(10000);
      try {
        var db = getDatabase(rootFolder);
        if (!db.statuses) db.statuses = {};
        db.statuses[rawId] = data.status;
        if (cleanNum) {
          db.statuses[cleanNum] = data.status;
          db.statuses["#" + cleanNum] = data.status;
          db.statuses["RS-2026-" + cleanNum] = data.status;
        }
        for (var i = 0; i < db.orders.length; i++) {
          var oNum = normalizeGasId(db.orders[i].numericId || db.orders[i].id || "");
          if (oNum === cleanNum || String(db.orders[i].numericId) === rawId || String(db.orders[i].id) === rawId) {
            db.orders[i].status = data.status;
            break;
          }
        }
        saveDatabase(rootFolder, db);
      } finally {
        lock.releaseLock();
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // (F) ক্লায়েন্ট অফার অনুমোদন বা প্রাইস আপডেট (Accept Client Offer / Update Order Price)
    if (data.action === "accept_client_offer" || data.action === "update_order_price") {
      var rawId = String(data.numericId || data.orderId || "");
      var cleanNum = normalizeGasId(rawId);
      var lock = LockService.getScriptLock();
      lock.tryLock(10000);
      try {
        var db = getDatabase(rootFolder);
        if (!db.agreedPrices) db.agreedPrices = {};
        var priceToSet = data.proposedPrice || data.price || true;
        if (cleanNum) {
          db.agreedPrices[cleanNum] = priceToSet;
          db.agreedPrices["#" + cleanNum] = priceToSet;
          db.agreedPrices["RS-2026-" + cleanNum] = priceToSet;
        }
        if (rawId) {
          db.agreedPrices[rawId] = priceToSet;
        }
        var newPrice = data.proposedPrice || data.price;
        for (var i = 0; i < db.orders.length; i++) {
          var oNum = normalizeGasId(db.orders[i].numericId || db.orders[i].id || "");
          if (oNum === cleanNum || String(db.orders[i].numericId) === rawId || String(db.orders[i].id) === rawId) {
            db.orders[i].isAgreed = true;
            if (newPrice) db.orders[i].price = newPrice;
          }
        }
        saveDatabase(rootFolder, db);
      } finally {
        lock.releaseLock();
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // (G) ডেলিভারি গুগল ড্রাইভ লিংক সেভ করা
    if (data.action === "update_delivery_link") {
      var rawId = String(data.numericId || "");
      var cleanNum = normalizeGasId(rawId);
      var lock = LockService.getScriptLock();
      lock.tryLock(10000);
      try {
        var db = getDatabase(rootFolder);
        if (!db.deliveries) db.deliveries = {};
        if (!db.statuses) db.statuses = {};
        if (cleanNum) {
          db.deliveries[cleanNum] = data.drive;
          db.deliveries["#" + cleanNum] = data.drive;
          db.statuses[cleanNum] = data.status || "delivered";
          db.statuses["#" + cleanNum] = data.status || "delivered";
        }
        if (rawId) {
          db.deliveries[rawId] = data.drive;
          db.statuses[rawId] = data.status || "delivered";
        }
        for (var i = 0; i < db.orders.length; i++) {
          var oNum = normalizeGasId(db.orders[i].numericId || db.orders[i].id || "");
          if (oNum === cleanNum || String(db.orders[i].numericId) === rawId || String(db.orders[i].id) === rawId) {
            db.orders[i].drive = data.drive;
            db.orders[i].status = data.status || "delivered";
            break;
          }
        }
        saveDatabase(rootFolder, db);
      } finally {
        lock.releaseLock();
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // (H) অতিরিক্ত ফি / রিভিশন ফি যোগ করা (Extra Fee - Dual Compatible)
    if (data.action === "update_extra_fee") {
      var rawId = String(data.numericId || "");
      var cleanNum = normalizeGasId(rawId);
      var amt = Number(data.extraFee || data.amount || 0);
      var desc = data.extraDesc || data.desc || "Additional Revision & Scope";
      var qty = Number(data.extraQty || data.qty || 1);
      var rate = Number(data.extraRate || data.rate || (amt / qty));
      
      var lock = LockService.getScriptLock();
      lock.tryLock(10000);
      try {
        var db = getDatabase(rootFolder);
        if (!db.extraWork) db.extraWork = {};
        var feeObj = {
          amount: amt,
          extraFee: amt,
          desc: desc,
          extraDesc: desc,
          qty: qty,
          extraQty: qty,
          rate: rate,
          extraRate: rate
        };
        if (cleanNum) {
          db.extraWork[cleanNum] = feeObj;
          db.extraWork["#" + cleanNum] = feeObj;
          db.extraWork["RS-2026-" + cleanNum] = feeObj;
        }
        if (rawId) db.extraWork[rawId] = feeObj;
        for (var i = 0; i < db.orders.length; i++) {
          var oNum = normalizeGasId(db.orders[i].numericId || db.orders[i].id || "");
          if (oNum === cleanNum || String(db.orders[i].numericId) === rawId || String(db.orders[i].id) === rawId) {
            db.orders[i].extraFee = amt;
            db.orders[i].extraDesc = desc;
            db.orders[i].extraQty = qty;
            db.orders[i].extraRate = rate;
            break;
          }
        }
        saveDatabase(rootFolder, db);
      } finally {
        lock.releaseLock();
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // (I) অতিরিক্ত ফি রিমুভ করা (সব ভ্যারিয়েন্ট ও নিউমেরিক ফরম্যাট সহ)
    if (data.action === "clear_extra_fee") {
      var rawId = String(data.numericId || "");
      var cleanNum = normalizeGasId(rawId);
      var lock = LockService.getScriptLock();
      lock.tryLock(10000);
      try {
        var db = getDatabase(rootFolder);
        if (db.extraWork && typeof db.extraWork === "object") {
          delete db.extraWork[rawId];
          if (cleanNum) {
            delete db.extraWork[cleanNum];
            delete db.extraWork["#" + cleanNum];
            delete db.extraWork["RS-2026-" + cleanNum];
            delete db.extraWork["#RS-2026-" + cleanNum];
            Object.keys(db.extraWork).forEach(function(k) {
              if (normalizeGasId(k) === cleanNum) {
                delete db.extraWork[k];
              }
            });
          }
        }
        for (var i = 0; i < db.orders.length; i++) {
          var oNum = normalizeGasId(db.orders[i].numericId || db.orders[i].id || "");
          if (oNum === cleanNum || String(db.orders[i].numericId) === rawId || String(db.orders[i].id) === rawId) {
            delete db.orders[i].extraFee;
            delete db.orders[i].extraDesc;
            delete db.orders[i].extraQty;
            delete db.orders[i].extraRate;
            break;
          }
        }
        saveDatabase(rootFolder, db);
      } finally {
        lock.releaseLock();
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // (J) অর্ডার স্থায়ীভাবে মুছে ফেলা (Admin Order Deletion - Universal Normalized Match)
    if (data.action === "delete_order") {
      var rawId = String(data.numericId || data.id || "");
      var targetId = normalizeGasId(rawId);
      var lock = LockService.getScriptLock();
      lock.tryLock(10000);
      try {
        var db = getDatabase(rootFolder);
        db.orders = db.orders.filter(function(o) { 
          var oNum = normalizeGasId(o.numericId || o.id || o.orderId);
          return oNum !== targetId && String(o.numericId) !== rawId && String(o.id) !== rawId; 
        });

        function purgeKeys(obj) {
          if (!obj || typeof obj !== 'object') return;
          delete obj[rawId];
          delete obj[targetId];
          delete obj["#" + targetId];
          delete obj["RS-2026-" + targetId];
          delete obj["#RS-2026-" + targetId];
          delete obj["2026" + targetId];
          Object.keys(obj).forEach(function(k) {
            if (normalizeGasId(k) === targetId) {
              delete obj[k];
            }
          });
        }

        purgeKeys(db.statuses);
        purgeKeys(db.deliveries);
        purgeKeys(db.extraWork);
        purgeKeys(db.paidStatuses);
        purgeKeys(db.paymentClaims);
        purgeKeys(db.agreedPrices);

        if (!db.deletedOrders || typeof db.deletedOrders !== "object") db.deletedOrders = {};
        if (targetId) {
          db.deletedOrders[targetId] = true;
          db.deletedOrders["#" + targetId] = true;
          db.deletedOrders["RS-2026-" + targetId] = true;
          db.deletedOrders["#RS-2026-" + targetId] = true;
          db.deletedOrders["2026" + targetId] = true;
        }
        if (rawId) {
          db.deletedOrders[rawId] = true;
        }
        saveDatabase(rootFolder, db);
      } finally {
        lock.releaseLock();
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", targetId: targetId }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // (K) ক্লায়েন্ট প্রোফাইল ডেটাবেজ থেকে মুছে ফেলা
    if (data.action === "delete_client") {
      var email = (data.email || "").toLowerCase().trim();
      var lock = LockService.getScriptLock();
      lock.tryLock(10000);
      try {
        var db = getDatabase(rootFolder);
        delete db.users[email];
        saveDatabase(rootFolder, db);
      } finally {
        lock.releaseLock();
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // (L) GOOGLE GEMINI AI STUDIO ASSISTANT CONCIERGE HANDLER
    if (data.action === "chat_ai") {
      var userMsg = String(data.message || "").trim();
      var chatHistory = data.history || [];
      var clientEmail = String(data.clientEmail || "").toLowerCase().trim();

      var apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || 
                   (typeof GEMINI_API_KEY !== "undefined" ? GEMINI_API_KEY : "");

      if (!apiKey) {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: "fallback", 
          message: "No Gemini API Key configured in Google Apps Script Script Properties." 
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var systemPrompt = 
        "You are the official AI Studio Concierge for Retoucher Shoaib (Shoaib Siddique) — an elite high-end commercial retouching studio based in Dhaka, Bangladesh, servicing global luxury jewelry brands, fashion designers, and commercial advertising agencies.\n\n" +
        "CORE CAPABILITIES & RETOUCHING SPECIFICATIONS:\n" +
        "- High-End Jewelry & Watches: Metallic texture preservation, micro-dust & scratch elimination, focus stacking, crisp diamond facets, authentic realistic drop shadows.\n" +
        "- Fashion, Beauty & Commercial Campaigns: Natural micro-skin texture preservation (non-destructive dodge & burn, high-end frequency separation), 16-bit color fidelity, flyaway hair cleanup, creative color grading.\n" +
        "- E-Commerce & Product Catalogs: Exact PANTONE/hex color matching, hand-drawn clipping paths with preserved multi-layer alpha channels.\n" +
        "- Production Deliverables: Certified 16-bit Master PSDs with intact alpha channels, lossless TIFFs, web-optimized sRGB/Adobe RGB JPEGs.\n" +
        "- SLAs: 24 Hours Express, 48 Hours Standard, 72 Hours Relaxed.\n\n" +
        "PAYMENT METHODS & WISE GUIDANCE (HIGH PRIORITY):\n" +
        "- Supported Payment Methods: Domestic Bank Transfers (USD ACH Routing, EUR SEPA IBAN, GBP Sort Code, CAD Transit), Wise Direct, and Credit/Debit Card Checkout.\n" +
        "- CARD PAYMENT & WISE SIGN-UP GUIDANCE (EXTREMELY IMPORTANT): When clients select 'Credit / Debit Card' on their invoice, payment is processed securely via Wise's PCI-DSS compliant card infrastructure. If Wise prompts them to 'Sign Up' or 'Create an Account', reassure the client warmly: 'Wise requires a quick 1-minute free registration to comply with international 3D-Secure banking standards and ensure you are not hit with inflated hidden foreign exchange conversion fees from traditional credit card networks. Once registered, you can pay directly using any standard Visa, MasterCard, or Amex card in seconds. Alternatively, you can always choose direct Domestic Bank Transfer (ACH in USD, SEPA in EUR, Sort Code in GBP) straight from your regular mobile banking app without creating a Wise account!'\n" +
        "- ABOUT WISE: Wise (formerly TransferWise) is an internationally regulated financial institution authorized by the UK Financial Conduct Authority (FCA), FinCEN in the US, and trusted by over 16 million people and businesses worldwide. Unlike traditional wire transfers that take days and charge heavy intermediary fees ($40+), Wise provides real mid-market exchange rates with zero hidden markups.\n" +
        "- PAYMENT REFERENCE CODE: After transferring funds via bank or card, the client receives a unique Confirmation Reference # (e.g., #982401). They must enter this code in the payment section of their invoice and click 'Confirm Transfer' so Shoaib's studio can verify and issue an official receipt.\n\n" +
        "STRICT BUSINESS & PRIVACY GUARDRAILS:\n" +
        "1. PRICE & SCOPE MODIFICATIONS FORBIDDEN: You do NOT have the authority to alter invoice prices, negotiate rates, offer discounts, or adjust project commissions. If a client asks for a discount, price adjustment, or scope alteration, politely decline: 'I apologize, but adjusting project rates, offering discounts, or altering agreed commission scopes is strictly beyond my authority as an AI assistant. All commercial quotes and rates are handled personally by Shoaib Siddique. Please speak directly with Shoaib on WhatsApp: +880 1710-763251 (or use the WhatsApp button on your portal) to discuss your budget or custom term.'\n" +
        "2. ABSOLUTE CONFIDENTIALITY: Under NO circumstances disclose administrative passwords, credentials, access keys, internal Google Drive root IDs, or the identities/emails/data of other clients. If asked, politely refuse stating strict privacy and confidentiality protocols.\n" +
        "3. TONE & STYLE: Professional, articulate, warm, concise, and helpful. Use clean bullet points where appropriate.";

      try {
        var contents = [];
        if (Array.isArray(chatHistory)) {
          for (var h = 0; h < chatHistory.length; h++) {
            var item = chatHistory[h];
            if (item && item.text) {
              contents.push({
                role: item.role === "user" ? "user" : "model",
                parts: [{ text: item.text }]
              });
            }
          }
        }
        contents.push({
          role: "user",
          parts: [{ text: userMsg }]
        });

        var payload = {
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600
          }
        };

        var geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
        var response = UrlFetchApp.fetch(geminiUrl, {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        });

        var resJson = JSON.parse(response.getContentText());
        var replyText = "";
        if (resJson && resJson.candidates && resJson.candidates[0] && resJson.candidates[0].content && resJson.candidates[0].content.parts) {
          replyText = resJson.candidates[0].content.parts.map(function(p) { return p.text; }).join("\n");
        } else if (resJson && resJson.error) {
          return ContentService.createTextOutput(JSON.stringify({ status: "fallback", error: resJson.error.message }))
            .setMimeType(ContentService.MimeType.JSON);
        }

        return ContentService.createTextOutput(JSON.stringify({ status: "success", reply: replyText }))
          .setMimeType(ContentService.MimeType.JSON);
      } catch(geminiErr) {
        return ContentService.createTextOutput(JSON.stringify({ status: "fallback", error: geminiErr.toString() }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unknown action: " + data.action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
