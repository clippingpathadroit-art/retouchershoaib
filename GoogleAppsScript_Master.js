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
      extraWork: {}
    };
    return rootFolder.createFile(DB_FILE_NAME, JSON.stringify(initial, null, 2), "application/json");
  }
}

function getDatabase(rootFolder) {
  try {
    var file = getOrCreateDatabaseFile(rootFolder);
    var content = file.getBlob().getDataAsString();
    if (!content || content.trim().length === 0) {
      return { status: "success", orders: [], users: {}, statuses: {}, deliveries: {}, extraWork: {} };
    }
    var db = JSON.parse(content);
    if (!db.orders || !Array.isArray(db.orders)) db.orders = [];
    if (!db.users || typeof db.users !== "object") db.users = {};
    if (!db.statuses || typeof db.statuses !== "object") db.statuses = {};
    if (!db.deliveries || typeof db.deliveries !== "object") db.deliveries = {};
    if (!db.extraWork || typeof db.extraWork !== "object") db.extraWork = {};
    db.status = "success";
    return db;
  } catch(e) {
    return { status: "success", orders: [], users: {}, statuses: {}, deliveries: {}, extraWork: {} };
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
      var orderId = String(data.orderId).replace("#", "").trim();
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
      var orderObj = data.orderData || {
        id: "#RS-2026-" + orderId,
        numericId: orderId,
        title: data.projectTitle || "Commercial Project",
        service: data.service || "Commercial Retouching",
        images: data.images || "RAW files",
        deadline: data.deadline || "Express SLA",
        price: data.price || "$0.00 USD",
        clientName: data.clientName || "Studio Client",
        clientEmail: email,
        clientCompany: data.clientCompany || "Studio",
        status: "pending",
        instructions: data.instructions || "",
        createdAt: Utilities.formatDate(new Date(), "GMT", "MMM dd, yyyy")
      };
      orderObj.numericId = orderId;
      orderObj.drive = orderUrl;
      orderObj.orderFolder = "Order #" + orderId;

      var lock = LockService.getScriptLock();
      lock.tryLock(10000);
      try {
        var db = getDatabase(rootFolder);
        var matchIdx = -1;
        for (var i = 0; i < db.orders.length; i++) {
          if (String(db.orders[i].numericId) === orderId) {
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
          "https://retouchershoaib.pages.dev/admin\n";

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
            "https://retouchershoaib.pages.dev/portal\n\n" +
            "If you have additional references or questions, feel free to reply directly to this email or contact us on WhatsApp at +880 1710 763251.\n\n" +
            "Warm regards,\n\n" +
            "Shoaib Siddique\n" +
            "High-End Commercial Retoucher & Creative Director\n" +
            "Retoucher Shoaib® | Commercial Post-Production Studio\n" +
            "https://retouchershoaib.pages.dev\n";

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

    // (E) অর্ডার স্ট্যাটাস আপডেট (Admin -> Cloud)
    if (data.action === "update_order_status") {
      var numId = String(data.numericId);
      var lock = LockService.getScriptLock();
      lock.tryLock(10000);
      try {
        var db = getDatabase(rootFolder);
        db.statuses[numId] = data.status;
        for (var i = 0; i < db.orders.length; i++) {
          if (String(db.orders[i].numericId) === numId) {
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

    // (F) ক্লায়েন্ট অফার অনুমোদন (Accept Client Offer)
    if (data.action === "accept_client_offer") {
      var numId = String(data.numericId);
      var lock = LockService.getScriptLock();
      lock.tryLock(10000);
      try {
        var db = getDatabase(rootFolder);
        for (var i = 0; i < db.orders.length; i++) {
          if (String(db.orders[i].numericId) === numId) {
            db.orders[i].isAgreed = true;
            if (data.proposedPrice) db.orders[i].price = data.proposedPrice;
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

    // (G) ডেলিভারি গুগল ড্রাইভ লিংক সেভ করা
    if (data.action === "update_delivery_link") {
      var numId = String(data.numericId);
      var lock = LockService.getScriptLock();
      lock.tryLock(10000);
      try {
        var db = getDatabase(rootFolder);
        db.deliveries[numId] = data.drive;
        db.statuses[numId] = data.status || "delivered";
        for (var i = 0; i < db.orders.length; i++) {
          if (String(db.orders[i].numericId) === numId) {
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

    // (H) অতিরিক্ত ফি / রিভিশন ফি যোগ করা (Extra Fee)
    if (data.action === "update_extra_fee") {
      var numId = String(data.numericId);
      var lock = LockService.getScriptLock();
      lock.tryLock(10000);
      try {
        var db = getDatabase(rootFolder);
        db.extraWork[numId] = {
          extraFee: data.extraFee,
          extraDesc: data.extraDesc,
          extraQty: data.extraQty,
          extraRate: data.extraRate
        };
        saveDatabase(rootFolder, db);
      } finally {
        lock.releaseLock();
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // (I) অতিরিক্ত ফি রিমুভ করা
    if (data.action === "clear_extra_fee") {
      var numId = String(data.numericId);
      var lock = LockService.getScriptLock();
      lock.tryLock(10000);
      try {
        var db = getDatabase(rootFolder);
        delete db.extraWork[numId];
        saveDatabase(rootFolder, db);
      } finally {
        lock.releaseLock();
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // (J) অর্ডার স্থায়ীভাবে মুছে ফেলা (Admin Order Deletion)
    if (data.action === "delete_order") {
      var numId = String(data.numericId);
      var lock = LockService.getScriptLock();
      lock.tryLock(10000);
      try {
        var db = getDatabase(rootFolder);
        db.orders = db.orders.filter(function(o) { return String(o.numericId) !== numId; });
        delete db.statuses[numId];
        delete db.deliveries[numId];
        delete db.extraWork[numId];
        saveDatabase(rootFolder, db);
      } finally {
        lock.releaseLock();
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
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
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unknown action: " + data.action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
