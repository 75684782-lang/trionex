const firebaseConfig = {
    apiKey: "AIzaSyC-q4b5vcvtzPcMlrFEthwGs5VkuzZHvKg",
    authDomain: "trionex-db.firebaseapp.com",
    databaseURL: "https://trionex-db-default-rtdb.firebaseio.com",
    projectId: "trionex-db",
    storageBucket: "trionex-db.firebasestorage.app",
    messagingSenderId: "578762600092",
    appId: "1:578762600092:web:8671f08c90f61015b6c759"
};

let db = null;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
} catch (e) { console.error(e); }

const IMAGEN_DEFECTO = "https://via.placeholder.com/300?text=STEC";
let productos = [];
let slides = [];
let tickets = [];
let carrito = JSON.parse(localStorage.getItem('stec_cart')) || [];
let adminPass = "1234";
let idImagenTemp = null;

if (db) {
    db.ref('stec_inventario').on('value', (snapshot) => {
        const data = snapshot.val();
        productos = data ? Object.values(data) : [];
        window.renderTienda();
        window.actualizarCarritoUI();
        if(document.getElementById('panel-admin').style.display === 'block') window.renderAdminTable();
    });
    db.ref('stec_carrusel').on('value', (snapshot) => {
        const data = snapshot.val();
        slides = data ? Object.values(data) : [];
        window.renderCarrusel();
        window.renderAdminSlides();
    });
    db.ref('stec_soporte').on('value', (snapshot) => {
        const data = snapshot.val();
        tickets = data ? Object.values(data) : [];
        if(document.getElementById('panel-admin').style.display === 'block') {
            window.renderSupportTable();
            window.actualizarStatsSoporte();
        }
    });
    db.ref('stec_config/adminPass').on('value', (s) => { if (s.val()) adminPass = s.val(); });
}

// --- TIENDA ---
window.renderTienda = function(filtro = null) {
    const grid = document.getElementById('grid-productos');
    grid.innerHTML = "";
    let lista = productos;
    let categoriaActual = filtro || 'todo';
    if (categoriaActual !== 'todo') lista = lista.filter(p => p.categoria === categoriaActual);
    const busqueda = document.getElementById('search-header').value.toLowerCase();
    if (busqueda) { lista = lista.filter(p => p.nombre.toLowerCase().includes(busqueda)); categoriaActual = 'busqueda'; }
    if (lista.length === 0) { grid.innerHTML = `<p style="margin:20px auto;text-align:center;">Sin resultados.</p>`; return; }
    const esModoLaptop = (categoriaActual === 'laptops');
    grid.className = esModoLaptop ? 'grid-list' : 'grid';
    lista.forEach(p => {
        const card = document.createElement('div');
        card.className = esModoLaptop ? 'card horizontal' : 'card';
        const stockHTML = p.stock > 0 ? `<div class="stock-ok"><i class="fa-solid fa-check"></i> Stock: ${p.stock}</div>` : `<div class="stock-no"><i class="fa-solid fa-xmark"></i> Agotado</div>`;
        const precioFinal = p.precioOferta ? p.precioOferta : p.precio;
        const precioHTML = p.precioOferta ? `<span style="text-decoration:line-through;font-size:0.9rem;color:#999;">S/ ${p.precio}</span> S/ ${precioFinal}` : `S/ ${p.precio}`;
        if (esModoLaptop) {
            card.innerHTML = `<img src="${p.imagen || IMAGEN_DEFECTO}"><div class="card-info"><h3>${p.nombre}</h3><ul class="specs-list"><li><b>Marca:</b> ${p.marca || 'Genérico'}</li><li><b>Procesador:</b> ${p.spec_proc || '-'}</li><li><b>RAM:</b> ${p.spec_ram || '-'}</li><li><b>Disco:</b> ${p.spec_almacen || '-'}</li><li><b>Pantalla:</b> ${p.spec_pantalla || '-'}</li></ul></div><div class="card-actions"><div class="price">S/ ${precioFinal}</div>${stockHTML}<button onclick="window.agregarCarrito(${p.id})" class="btn-add" ${p.stock<=0?'disabled':''}>Agregar</button></div>`;
        } else {
            card.innerHTML = `<img src="${p.imagen || IMAGEN_DEFECTO}"><div class="card-info"><span class="card-marca">${p.marca || ''}</span><h3>${p.nombre}</h3>${stockHTML}<div class="price">${precioHTML}</div></div><button onclick="window.agregarCarrito(${p.id})" class="btn-add" ${p.stock<=0?'disabled':''}>Agregar</button>`;
        }
        grid.appendChild(card);
    });
};

// --- SOPORTE ---
window.crearTicket = function() {
    const cliente = document.getElementById('rep-cliente').value;
    const dni = document.getElementById('rep-dni').value;
    const equipo = document.getElementById('rep-equipo').value;
    const falla = document.getElementById('rep-falla').value;
    if(cliente && dni && equipo) {
        const id = Date.now();
        const ticket = {
            id: id, cliente: cliente, dni: dni, telefono: document.getElementById('rep-telefono').value,
            equipo: equipo, pass: document.getElementById('rep-pass').value, falla: falla,
            costo: parseFloat(document.getElementById('rep-costo').value) || 0,
            adelanto: parseFloat(document.getElementById('rep-adelanto').value) || 0,
            estado: 'pendiente', fecha: new Date().toLocaleDateString()
        };
        db.ref('stec_soporte/' + id).set(ticket);
        window.toast("Ticket Generado ✅");
        document.getElementById('rep-cliente').value=""; document.getElementById('rep-dni').value=""; document.getElementById('rep-telefono').value=""; document.getElementById('rep-equipo').value=""; document.getElementById('rep-falla').value=""; document.getElementById('rep-costo').value=""; document.getElementById('rep-adelanto').value=""; document.getElementById('rep-pass').value="";
    } else { window.toast("Faltan datos"); }
};

function calcularMora(fechaTicketStr) {
    if(!fechaTicketStr) return 0;
    // Parsear fecha DD/MM/YYYY a objeto Date
    const partes = fechaTicketStr.split('/');
    if(partes.length !== 3) return 0;
    const fechaTicket = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
    const hoy = new Date();
    const diffTime = Math.abs(hoy - fechaTicket);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if(diffDays > 30) {
        const mesesMora = Math.ceil((diffDays - 30) / 30);
        return mesesMora * 20;
    }
    return 0;
}

window.renderSupportTable = function() {
    const tbody = document.getElementById('soporte-tbody');
    tbody.innerHTML = "";
    
    const lista = [...tickets].reverse();
    const filtro = document.getElementById('buscadorSoporte').value.toLowerCase();
    
    const filtrados = lista.filter(t => 
        t.cliente.toLowerCase().includes(filtro) || 
        (t.dni && t.dni.includes(filtro))
    );

    filtrados.forEach(t => {
        // Color del selector
        let selectClass = 'status-pendiente';
        if(t.estado === 'proceso') selectClass = 'status-proceso';
        if(t.estado === 'listo') selectClass = 'status-listo';
        if(t.estado === 'entregado') selectClass = 'status-entregado';

        // Cálculo de Mora
        const costoBase = t.costo || 0;
        const adelanto = t.adelanto || 0;
        let mora = 0;
        if (t.estado !== 'entregado') mora = calcularMora(t.fecha);
        const totalConMora = costoBase + mora;
        const saldo = totalConMora - adelanto;
        
        let moraHTML = mora > 0 ? `<div class="mora-alert">+ S/ ${mora} Mora</div>` : '';
        let saldoHTML = saldo > 0 ? `<div style="color:#ff1744; font-weight:bold; font-size:0.8rem;">Debe: S/ ${saldo.toFixed(2)}</div>` : `<div style="color:green; font-weight:bold; font-size:0.8rem;">Pagado</div>`;

        tbody.innerHTML += `
            <tr>
                <td>
                    <select onchange="window.cambiarEstadoTicket(${t.id}, this.value)" class="status-select ${selectClass}">
                        <option value="pendiente" ${t.estado==='pendiente'?'selected':''}>Pendiente</option>
                        <option value="proceso" ${t.estado==='proceso'?'selected':''}>En Taller</option>
                        <option value="listo" ${t.estado==='listo'?'selected':''}>Listo</option>
                        <option value="entregado" ${t.estado==='entregado'?'selected':''}>Entregado</option>
                    </select>
                    <br>
                    <small style="color:#777; display:block; margin-top:5px;">${t.fecha}</small>
                </td>
                <td>
                    <div class="ticket-cliente">${t.cliente}</div>
                    <div class="ticket-dni">${t.dni || '-'}</div>
                </td>
                <td>
                    <div class="ticket-equipo">${t.equipo}</div>
                    <small style="color:#555;">${t.falla}</small>
                </td>
                <td>
                    <div class="ticket-pago">S/ ${costoBase}</div>
                    ${moraHTML}
                    ${saldoHTML}
                </td>
                <td>
                    <div style="display:flex; gap:5px; justify-content: flex-end;">
                        <button onclick="window.verTicket(${t.id})" class="btn-mini" style="background:#333; color:white;" title="Imprimir Recibo"><i class="fa-solid fa-print"></i></button>
                        <button onclick="window.borrarTicket(${t.id})" class="btn-mini btn-trash"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
};
window.verTicket = function(id) {
    const t = tickets.find(x => x.id === id);
    if(!t) return;
    document.getElementById('print-id').innerText = t.id.toString().slice(-6);
    document.getElementById('print-fecha').innerText = t.fecha;
    document.getElementById('print-cliente').innerText = t.cliente;
    document.getElementById('print-dni').innerText = t.dni || '-';
    document.getElementById('print-tel').innerText = t.telefono || '-';
    document.getElementById('print-equipo').innerText = t.equipo;
    document.getElementById('print-pass').innerText = t.pass || '-';
    document.getElementById('print-falla').innerText = t.falla;
    const mora = (t.estado !== 'entregado') ? calcularMora(t.fecha) : 0;
    const total = (t.costo||0) + mora;
    const saldo = total - (t.adelanto||0);
    document.getElementById('print-total').innerText = total.toFixed(2);
    document.getElementById('print-acuenta').innerText = (t.adelanto||0).toFixed(2);
    document.getElementById('print-saldo').innerText = saldo.toFixed(2);
    document.getElementById('modal-ticket').style.display = 'flex';
};
window.imprimirTicket = () => window.print();
window.cambiarVistaAdmin = (v) => { document.getElementById('view-inventario').style.display='none'; document.getElementById('view-soporte').style.display='none'; document.getElementById('tab-inventario').classList.remove('active'); document.getElementById('tab-soporte').classList.remove('active'); document.getElementById('view-'+v).style.display='block'; document.getElementById('tab-'+v).classList.add('active'); };
window.cambiarEstadoTicket = (id, est) => db.ref('stec_soporte/' + id + '/estado').set(est);
window.borrarTicket = (id) => { if(confirm("Borrar Ticket?")) db.ref('stec_soporte/' + id).remove(); };
window.actualizarStatsSoporte = () => { document.getElementById('stat-taller').innerText = tickets.filter(t=>['pendiente','proceso'].includes(t.estado)).length; document.getElementById('stat-listos').innerText = tickets.filter(t=>t.estado==='listo').length; };

// UTILS
window.filtrar = (cat) => { document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active')); event.target.classList.add('active'); window.renderTienda(cat); };
window.buscarProductoCliente = () => window.renderTienda();
window.agregarCarrito = (id) => { const p = productos.find(x => x.id === id); if (p && p.stock > 0) { carrito.push(p); localStorage.setItem('stec_cart', JSON.stringify(carrito)); window.actualizarCarritoUI(); window.toast("Añadido"); } else { window.toast("Agotado"); } };
window.actualizarCarritoUI = () => { document.getElementById('cart-count').innerText = carrito.length; const l = document.getElementById('carrito-items'); l.innerHTML = ""; let t = 0; carrito.forEach((p, i) => { t += parseFloat(p.precioOferta || p.precio); l.innerHTML += `<div style="display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid #eee;"><div><b>${p.nombre}</b><br>S/ ${p.precioOferta||p.precio}</div><i onclick="window.borrarDelCarrito(${i})" class="fa-solid fa-trash" style="color:red;cursor:pointer;"></i></div>`; }); document.getElementById('cart-total').innerText = `S/ ${t.toFixed(2)}`; };
window.borrarDelCarrito = (i) => { carrito.splice(i, 1); localStorage.setItem('stec_cart', JSON.stringify(carrito)); window.actualizarCarritoUI(); };
window.enviarPedido = () => { if(carrito.length===0) return window.toast("Vacío"); const n = document.getElementById('cliente-nombre').value; if(!n) return window.toast("Nombre?"); let m = `*PEDIDO STEC* 📦%0ACliente: ${n}%0A`; let t = 0; carrito.forEach(p => { t += parseFloat(p.precioOferta || p.precio); m += `- ${p.nombre}%0A`; if(db && p.stock > 0) db.ref('stec_inventario/' + p.id + '/stock').set(p.stock - 1); }); window.open(`https://wa.me/51961996631?text=${m}%0ATotal: S/ ${t}`, '_blank'); carrito=[]; localStorage.setItem('stec_cart', JSON.stringify(carrito)); window.actualizarCarritoUI(); window.cerrarModal('modal-carrito'); };
let slideIndex = 0; window.renderCarrusel = () => { const c = document.getElementById('hero-carousel'); c.innerHTML = ""; if (slides.length === 0) { c.innerHTML = `<div class="carousel-slide active"><img src="https://via.placeholder.com/1200x600" style="filter:brightness(0.5)"></div>`; return; } slides.forEach((s, i) => { c.innerHTML += `<div class="carousel-slide ${i === 0 ? 'active' : ''}"><img src="${s.imagen}"></div>`; }); if (!window.carruselIntervalo) window.carruselIntervalo = setInterval(() => { const a = document.querySelectorAll('.carousel-slide'); if(a.length>0) { a.forEach(s=>s.classList.remove('active')); slideIndex=(slideIndex+1)%a.length; a[slideIndex].classList.add('active'); } }, 5000); };
window.toggleLaptopFields = function() { const cat = document.getElementById('new-cat').value; document.getElementById('laptop-specs').style.display = (cat === 'laptops') ? 'block' : 'none'; };
// ADMIN LOGIN
window.login = function() {
    const user = document.getElementById('login-user').value; // Capturamos el usuario
    const pass = document.getElementById('admin-pass').value;

    // Puedes poner una validación de usuario si quieres, por ejemplo:
    // if (user === 'admin' && pass === adminPass) { ... }
    
    // Por ahora mantenemos la validación solo por contraseña para no bloquearte:
    if (pass === adminPass) {
        window.cerrarModal('modal-login');
        document.getElementById('panel-admin').style.display = 'block';
        window.renderAdminTable(); 
        window.renderAdminSlides();
        
        // Resetear vista
        document.getElementById('new-cat').value = 'laptops'; 
        window.toggleLaptopFields();
        window.renderSupportTable(); 
        window.actualizarStatsSoporte();
        
        // Limpiar campos login
        document.getElementById('login-user').value = "";
        document.getElementById('admin-pass').value = "";
    } else { 
        window.toast("Contraseña incorrecta"); 
    }
};
window.crearProducto = function() { const n = document.getElementById('new-name').value; const m = document.getElementById('new-marca').value; const c = document.getElementById('new-cat').value; const p = document.getElementById('new-price').value; const s = document.getElementById('new-stock').value; if (n && p) { const id = Date.now(); const prod = { id: id, nombre: n, marca: m, categoria: c, precio: parseFloat(p), stock: parseInt(s), precioOferta: 0, imagen: "", spec_proc: document.getElementById('spec-proc').value, spec_ram: document.getElementById('spec-ram').value, spec_almacen: document.getElementById('spec-almacen').value, spec_pantalla: document.getElementById('spec-pantalla').value }; db.ref('stec_inventario/' + id).set(prod); window.toast("Guardado"); document.getElementById('new-name').value = ""; document.getElementById('new-price').value = ""; } else { window.toast("Faltan datos"); } };
window.renderAdminTable = function() { const tbody = document.getElementById('admin-tbody'); tbody.innerHTML = ""; const b = document.getElementById('buscadorAdmin').value.toLowerCase(); const f = productos.filter(p => p.nombre.toLowerCase().includes(b)); f.forEach(p => { tbody.innerHTML += `<tr><td><b>${p.nombre}</b><br><small>${p.marca||''}</small></td><td>${p.categoria}</td><td>S/ ${p.precio}</td><td style="text-align:center; font-weight:bold; color:${p.stock>0?'green':'red'}">${p.stock}</td><td style="text-align:right;"><button onclick="window.cambiarStock(${p.id}, 1)" class="action-btn btn-plus">+</button><button onclick="window.cambiarStock(${p.id}, -1)" class="action-btn btn-minus">-</button><button onclick="window.prepararFoto(${p.id})" class="action-btn btn-edit"><i class="fa-solid fa-camera"></i></button><button onclick="window.borrarProducto(${p.id})" class="action-btn btn-delete"><i class="fa-solid fa-trash"></i></button></td></tr>`; }); };
window.salirAdmin = () => document.getElementById('panel-admin').style.display = 'none';
window.cambiarStock = (id, v) => { const p = productos.find(x => x.id === id); if(p) db.ref('stec_inventario/' + id + '/stock').set(p.stock + v); };
window.borrarProducto = (id) => { if(confirm("Borrar?")) db.ref('stec_inventario/' + id).remove(); };
window.buscarProductoAdmin = () => window.renderAdminTable();
window.guardarSlide = () => { const f = document.getElementById('slide-file'); const t = document.getElementById('slide-text').value; if(f.files.length>0) { const r = new FileReader(); r.onload = (e) => { db.ref('stec_carrusel/' + Date.now()).set({ id: Date.now(), imagen: e.target.result, texto: t }); window.toast("Banner OK"); }; r.readAsDataURL(f.files[0]); } };
window.renderAdminSlides = () => { const l = document.getElementById('lista-slides-admin'); l.innerHTML = ""; slides.forEach(s => { l.innerHTML += `<div style="display:inline-block;position:relative;margin:5px;"><img src="${s.imagen}" style="height:50px;border-radius:5px;"><span onclick="db.ref('stec_carrusel/'+${s.id}).remove()" style="position:absolute;top:0;right:0;background:red;color:white;cursor:pointer;width:20px;text-align:center;">&times;</span></div>`; }); };
window.prepararFoto = (id) => { idImagenTemp = id; document.getElementById('subirImagenModal').style.display = 'flex'; };
window.confirmarCambioImagen = () => { const i = document.getElementById('archivoEditarInput'); if(i.files.length>0 && idImagenTemp) { const r = new FileReader(); r.onload = (e) => { db.ref('stec_inventario/' + idImagenTemp + '/imagen').set(e.target.result); window.cerrarModal('subirImagenModal'); window.toast("Imagen OK"); }; r.readAsDataURL(i.files[0]); } };
window.toast = (m) => { const x = document.getElementById("toast"); x.innerText = m; x.className = "show"; setTimeout(() => x.className = x.className.replace("show", ""), 3000); };
window.irAlLogin = () => document.getElementById('modal-login').style.display = 'flex';
window.verCarrito = () => { document.getElementById('modal-carrito').style.display = 'flex'; window.actualizarCarritoUI(); };
window.cerrarModal = (id) => document.getElementById(id).style.display = 'none';