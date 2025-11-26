// ==========================================
//   1. CONEXIÓN FIREBASE (COMPAT)
// ==========================================

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
    console.log("Firebase OK 🟢");
} catch (e) {
    console.error(e);
    // Si falla, usaremos una alerta visual más adelante
}

// ==========================================
//   2. VARIABLES & UTILIDADES UI
// ==========================================

const IMAGEN_DEFECTO = "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=600&auto=format&fit=crop";
let productos = []; 
let carrito = JSON.parse(localStorage.getItem('trionex_cart_final')) || [];
let idProductoEditandoImagen = null;
let idParaBorrar = null;
let idParaOferta = null;

// --- CONTRASEÑA EN LA NUBE ---
// Empezamos con 1234 por defecto, pero Firebase la actualizará en milisegundos
let adminPasswordActual = "1234"; 

// FUNCIÓN DE NOTIFICACIÓN ELEGANTE (TOAST)
window.mostrarToast = function(mensaje) {
    const x = document.getElementById("toast-notification");
    if(x) {
        x.className = "toast show";
        x.innerText = mensaje;
        setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
    } else {
        alert(mensaje);
    }
}

// ==========================================
//   3. SINCRONIZACIÓN (DATOS Y PASSWORD)
// ==========================================

if (db) {
    // 1. Escuchar PRODUCTOS
    db.ref('inventario').on('value', (snapshot) => {
        const data = snapshot.val();
        productos = data ? Object.values(data) : [];
        window.mostrarProductos();
        actualizarContador();
        if(document.getElementById('pantalla-admin').style.display === 'block') {
            window.renderizarTablaStock();
        }
    });

    // 2. Escuchar CONTRASEÑA (¡NUEVO!)
    // Esto descarga la contraseña de la nube automáticamente
    db.ref('config/adminPass').on('value', (snapshot) => {
        const pass = snapshot.val();
        if (pass) {
            adminPasswordActual = pass;
            console.log("Contraseña sincronizada con la nube 🔒");
        }
    });
}

function guardarEnNube(lista) {
    if (!db) return;
    const updates = {};
    lista.forEach(p => updates[p.id] = p);
    db.ref('inventario').update(updates);
}

// ==========================================
//   4. LÓGICA ADMIN (LOGIN Y ALERTAS)
// ==========================================

window.verificarPassword = function() {
    const input = document.getElementById('adminPassword');
    // Comparamos con la variable que ya se actualizó desde la nube
    if (input.value === adminPasswordActual) {
        window.cerrarModal('modal-login');
        document.getElementById('pantalla-tienda').style.display = 'none';
        document.querySelector('header').style.display = 'none';
        document.getElementById('pantalla-admin').style.display = 'block';
        
        window.renderizarTablaStock();
        input.value = "";
        
        window.checkStockInicial();
    } else {
        mostrarToast("Contraseña incorrecta ❌");
    }
};

window.cambiarContrasena = function() {
    const n = document.getElementById('nuevaContraAdmin').value;
    if(n.length >= 4) {
        if(db) {
            // GUARDAR LA NUEVA CLAVE EN LA NUBE
            db.ref('config/adminPass').set(n);
            mostrarToast("Clave actualizada en todos los dispositivos ☁️");
            document.getElementById('nuevaContraAdmin').value = "";
        } else {
            mostrarToast("Error de conexión");
        }
    } else {
        mostrarToast("Mínimo 4 caracteres");
    }
};

// Función que muestra el modal bonito de stock 0
window.checkStockInicial = function() {
    const agotados = productos.filter(p => p.stock <= 0);
    if(agotados.length > 0) {
        const listaDiv = document.getElementById('lista-agotados');
        listaDiv.innerHTML = "";
        agotados.forEach(p => {
            listaDiv.innerHTML += `
                <div class="agotado-item">
                    <span>${p.nombre}</span>
                    <strong>Sin Stock</strong>
                </div>`;
        });
        document.getElementById('modal-admin-alert').style.display = 'flex';
    } else {
        mostrarToast("Todo el inventario está OK ✅");
    }
};

// ==========================================
//   5. GESTIÓN DE PRODUCTOS (CON MODALES)
// ==========================================

window.crearProducto = function() {
    const n = document.getElementById('nuevoNombre').value;
    const m = document.getElementById('nuevaMarca').value;
    const p = Number(document.getElementById('nuevoPrecio').value);
    const po = Number(document.getElementById('nuevoPrecioOferta').value);
    const s = Number(document.getElementById('nuevoStock').value);
    const img = document.getElementById('nuevaImagen').value;
    
    if (n && p) {
        const nuevoId = Date.now();
        const nuevo = {
            id: nuevoId, nombre: n, marca: m, precio: p, precioOferta: po || null, stock: s, imagen: img || IMAGEN_DEFECTO
        };
        if(db) db.ref('inventario/' + nuevoId).set(nuevo);
        
        mostrarToast("Producto Creado ✨");
        document.getElementById('nuevoNombre').value = "";
        document.getElementById('nuevaMarca').value = "";
        document.getElementById('nuevoPrecio').value = "";
        document.getElementById('nuevoPrecioOferta').value = "";
        document.getElementById('nuevoStock').value = "";
        document.getElementById('nuevaImagen').value = "";
    } else {
        mostrarToast("Falta nombre o precio");
    }
};

// BORRAR CON MODAL DE CONFIRMACIÓN
window.borrarProducto = function(id) {
    idParaBorrar = id;
    document.getElementById('modal-confirmacion').style.display = 'flex';
};

// Evento del botón "Eliminar" dentro del modal
const btnConfirmar = document.getElementById('btn-confirmar-si');
if(btnConfirmar) {
    btnConfirmar.onclick = function() {
        if(idParaBorrar && db) {
            db.ref('inventario/' + idParaBorrar).remove();
            mostrarToast("Producto Eliminado 🗑️");
            window.cerrarModal('modal-confirmacion');
        }
    };
}

// GESTIONAR OFERTA CON MODAL PROMPT
window.gestionarOferta = function(id) {
    idParaOferta = id;
    document.getElementById('prompt-titulo').innerText = "Precio de Oferta (0 para quitar)";
    document.getElementById('prompt-input').value = "";
    document.getElementById('modal-prompt').style.display = 'flex';
    document.getElementById('prompt-input').focus();
};

const btnPrompt = document.getElementById('btn-prompt-ok');
if(btnPrompt) {
    btnPrompt.onclick = function() {
        const valor = parseFloat(document.getElementById('prompt-input').value);
        if(!isNaN(valor) && idParaOferta && db) {
            const final = valor > 0 ? valor : null;
            db.ref('inventario/' + idParaOferta + '/precioOferta').set(final);
            mostrarToast("Oferta Actualizada 🏷️");
            window.cerrarModal('modal-prompt');
        }
    };
}

window.cambiarStock = function(id, val) {
    const p = productos.find(x => x.id === id);
    if(p && db) {
        db.ref('inventario/' + id + '/stock').set(p.stock + val);
    }
};

// ==========================================
//   6. FUNCIONES GENÉRICAS (Ventanas)
// ==========================================

window.irAlLogin = function() {
    document.getElementById('modal-login').style.display = 'flex';
    setTimeout(() => document.getElementById('adminPassword').focus(), 100);
};

window.verCarrito = function() {
    document.getElementById('modal-carrito').style.display = 'flex';
    window.renderizarCarrito();
};

window.cerrarModal = function(id) { document.getElementById(id).style.display = 'none'; };

window.cerrarAdmin = function() {
    document.getElementById('pantalla-admin').style.display = 'none';
    document.getElementById('pantalla-tienda').style.display = 'block';
    document.querySelector('header').style.display = 'flex';
    window.mostrarProductos();
};

// ==========================================
//   7. RENDERIZADO VISUAL
// ==========================================

window.mostrarProductos = function(lista = productos) {
    const c = document.getElementById('contenedor-productos');
    if (!c) return;
    c.innerHTML = "";
    if (lista.length === 0) { c.innerHTML = "<p style='text-align:center; width:100%; padding:20px'>Cargando...</p>"; return; }

    lista.forEach(p => {
        const div = document.createElement('div');
        div.classList.add('producto-card');
        
        const agotado = p.stock <= 0;
        const stockStatus = agotado 
            ? '<span style="color:red; font-weight:bold">AGOTADO</span>' 
            : `<span style="color:green">Stock: ${p.stock}</span>`;

        let precioHTML = `<div class="precio-contenedor"><span class="precio">S/ ${p.precio}</span></div>`;
        let ofertaTag = '';
        if (p.precioOferta && p.precioOferta < p.precio) {
            precioHTML = `<div class="precio-contenedor"><span class="precio-tachado">S/ ${p.precio}</span><span class="precio-oferta">S/ ${p.precioOferta}</span></div>`;
            ofertaTag = `<div class="tag-oferta">OFERTA</div>`;
        }

        div.innerHTML = `
            ${ofertaTag}
            <img src="${p.imagen || IMAGEN_DEFECTO}" class="producto-img">
            <div style="color:#888; font-size:0.8rem; text-transform:uppercase;">${p.marca||''}</div>
            <h3>${p.nombre}</h3>
            ${precioHTML}
            <div style="margin-bottom:10px;">${stockStatus}</div>
            <button onclick="window.agregarAlCarrito(${p.id})" class="btn-add" ${agotado?'disabled':''}>${agotado?'Agotado':'Añadir'}</button>
        `;
        c.appendChild(div);
    });
};

window.renderizarTablaStock = function(lista = productos) {
    const t = document.getElementById('tabla-stock');
    if(!t) return;
    
    const filtro = document.getElementById('buscadorAdmin') ? document.getElementById('buscadorAdmin').value.toLowerCase() : '';
    const filtrados = lista.filter(p => p.nombre.toLowerCase().includes(filtro));

    t.innerHTML = `<tr style="background:#f5f5f5;"><th>Marca</th><th>Prod</th><th>$$</th><th>Of</th><th>Stk</th><th>Acc</th></tr>`;
    
    filtrados.forEach(p => {
        const ofertaTxt = p.precioOferta ? `(S/ ${p.precioOferta})` : '-';
        t.innerHTML += `
            <tr>
                <td style="font-size:0.8rem;">${p.marca || '-'}</td>
                <td>${p.nombre}</td>
                <td>S/ ${p.precio}</td>
                <td style="color:red; font-weight:bold;">${ofertaTxt}</td>
                <td style="font-weight:bold;">${p.stock}</td>
                <td>
                    <button onclick="window.cambiarStock(${p.id}, 1)">+</button>
                    <button onclick="window.cambiarStock(${p.id}, -1)">-</button>
                    <button onclick="window.cambiarImagenModal(${p.id})">F</button>
                    <button onclick="window.gestionarOferta(${p.id})">$</button>
                    <button onclick="window.borrarProducto(${p.id})" style="color:red;">x</button>
                </td>
            </tr>
        `;
    });
};

// ==========================================
//   8. OTRAS FUNCIONES
// ==========================================

window.agregarAlCarrito = function(id) {
    const item = productos.find(p => p.id === id);
    if (item && item.stock > 0) {
        carrito.push(item);
        localStorage.setItem('trionex_cart_final', JSON.stringify(carrito));
        actualizarContador();
        mostrarToast("Producto Añadido 👜");
    } else { mostrarToast("Sin Stock 🚫"); }
};

function actualizarContador() { document.getElementById('cuentaCarrito').innerText = carrito.length; }

window.renderizarCarrito = function() {
    const l = document.getElementById('lista-carrito');
    const t = document.getElementById('total-carrito');
    if(!l) return;
    l.innerHTML = "";
    let total = 0;
    
    const conteo = {};
    carrito.forEach(i => conteo[i.id] = (conteo[i.id]||0)+1);
    const unicos = [...new Set(carrito.map(i => i.id))];

    if (unicos.length === 0) l.innerHTML = "<p style='text-align:center'>Vacío</p>";
    else {
        unicos.forEach(id => {
            const p = productos.find(x => x.id === id);
            if(p) {
                const c = conteo[id];
                const pr = p.precioOferta || p.precio;
                total += pr * c;
                l.innerHTML += `
                    <div class="item-carrito" style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eee;">
                        <div><strong>${p.nombre}</strong><br><small>${c} x S/ ${pr}</small></div>
                        <button onclick="window.eliminarDelCarrito(${p.id})" style="color:red; border:none; background:none;"><i class="fa-solid fa-trash"></i></button>
                    </div>`;
            }
        });
    }
    t.innerText = `S/ ${total}`;
};

window.eliminarDelCarrito = function(id) {
    const idx = carrito.findIndex(p => p.id === id);
    if (idx > -1) carrito.splice(idx, 1);
    localStorage.setItem('trionex_cart_final', JSON.stringify(carrito));
    actualizarContador();
    window.renderizarCarrito();
};

window.enviarPedido = function() {
    if (carrito.length === 0) return mostrarToast("Carrito Vacío");
    const n = document.getElementById('nombreClienteInput').value;
    if (!n) return mostrarToast("Falta tu nombre");
    
    let msg = `*PEDIDO TRX* ⚜️%0ACliente: ${n}%0A`;
    let total = 0;
    carrito.forEach(p => {
        const real = productos.find(x => x.id === p.id);
        if(real) {
            let pr = real.precioOferta || real.precio;
            total += pr;
            msg += `- ${real.nombre} (${real.marca||''}) - S/ ${pr}%0A`;
            if(real.stock>0 && db) db.ref('inventario/' + real.id + '/stock').set(real.stock - 1);
        }
    });
    msg += `TOTAL: S/ ${total}`;
    window.open(`https://wa.me/51901007940?text=${msg}`, '_blank');
    carrito = [];
    localStorage.setItem('trionex_cart_final', JSON.stringify(carrito));
    actualizarContador();
    window.cerrarModal('modal-carrito');
};

// --- IMÁGENES ---
function archivoABase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

window.cambiarImagenModal = function(id) {
    idProductoEditandoImagen = id;
    document.getElementById('subirImagenModal').style.display = 'flex';
};

window.confirmarCambioImagen = async function() {
    const input = document.getElementById('archivoEditarInput');
    if (!input.files[0]) return mostrarToast("Selecciona imagen");
    try {
        const b64 = await archivoABase64(input.files[0]);
        if(db && idProductoEditandoImagen) {
            db.ref('inventario/' + idProductoEditandoImagen + '/imagen').set(b64);
            window.cerrarModal('subirImagenModal');
            mostrarToast("Imagen actualizada");
        }
    } catch(e) { mostrarToast("Error imagen"); }
};

window.buscarProductoAdmin = function() { window.renderizarTablaStock(); };
window.buscarProductoCliente = function() { 
    const txt = document.getElementById('buscadorCliente').value.toLowerCase();
    const f = productos.filter(p => p.nombre.toLowerCase().includes(txt) || (p.marca && p.marca.toLowerCase().includes(txt)));
    window.mostrarProductos(f);
};

window.descargarExcel = function() {
    let csv = "ID,MARCA,NOMBRE,PRECIO,OFERTA,STOCK\n";
    productos.forEach(p => csv += `${p.id},${p.marca||''},${p.nombre},${p.precio},${p.precioOferta||0},${p.stock}\n`);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
    link.download = "inventario.csv";
    link.click();
};