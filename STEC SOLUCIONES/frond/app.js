// js/app.js

// --- ESTADO DE LA APLICACIÓN ---
const App = {
    productos: [],
    carrito: JSON.parse(localStorage.getItem('stec_cart')) || [],
    adminPass: "1234",
    idTemp: null,
    filtroCategoria: 'todo',
    
    init: function() {
        console.log("🚀 Aplicación Iniciada");
        this.conectarDatos();
        this.actualizarCarritoIcono();
    },

    conectarDatos: function() {
        // Pedimos los datos al DataService
        DataService.escucharProductos((lista) => {
            this.productos = lista;
            this.renderTienda();
            if(this.isAdminVisible()) this.renderAdminTable();
        });

        DataService.escucharCarrusel((lista) => {
            this.renderCarrusel(lista);
            this.renderAdminSlides(lista);
        });

        DataService.obtenerPassword((pass) => {
            this.adminPass = pass;
        });
    },

    // --- VISTAS ---

    renderTienda: function() {
        const grid = document.getElementById('grid-productos');
        grid.innerHTML = "";
        
        let lista = this.productos;
        if (this.filtroCategoria !== 'todo') lista = lista.filter(p => p.categoria === this.filtroCategoria);
        
        // Buscador
        const busqueda = document.getElementById('search-header').value.toLowerCase();
        if (busqueda) lista = lista.filter(p => p.nombre.toLowerCase().includes(busqueda));

        if (lista.length === 0) {
            grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:20px;">No hay resultados.</p>`;
            return;
        }

        lista.forEach(p => {
            const card = document.createElement('div');
            card.className = 'card';
            const precio = p.precioOferta || p.precio;
            const ofertaHTML = p.precioOferta ? `<span style="text-decoration:line-through; font-size:0.8em; color:#888">S/ ${p.precio}</span> ` : '';
            const btnText = p.stock > 0 ? 'Agregar' : 'Agotado';
            const btnState = p.stock > 0 ? '' : 'disabled';
            const desc = p.descripcion ? `<div class="card-desc">${p.descripcion}</div>` : '';

            card.innerHTML = `
                <img src="${p.imagen || 'https://via.placeholder.com/300'}" onclick="App.verDetalle(${p.id})">
                <div class="card-info">
                    <span class="card-marca">${p.marca || ''}</span>
                    <h3>${p.nombre}</h3>
                    ${desc}
                    <div class="price">${ofertaHTML}S/ ${precio}</div>
                    <div class="${p.stock>0?'stock-ok':'stock-no'}">Stock: ${p.stock}</div>
                </div>
                <button class="btn-add" onclick="App.agregarCarrito(${p.id})" ${btnState}>${btnText}</button>
            `;
            grid.appendChild(card);
        });
    },

    renderCarrusel: function(slides) {
        const cont = document.getElementById('hero-carousel');
        if(!cont) return;
        cont.innerHTML = "";
        if(slides.length === 0) return; // O poner imagen default

        slides.forEach((s, i) => {
            cont.innerHTML += `<div class="carousel-slide ${i===0?'active':''}"><img src="${s.imagen}"></div>`;
        });
        
        // Reiniciar animación simple
        // (Aquí podrías mejorar la lógica del intervalo para que no se duplique)
    },

    // --- LÓGICA CARRITO ---

    agregarCarrito: function(id) {
        const p = this.productos.find(x => x.id === id);
        if (p && p.stock > 0) {
            this.carrito.push(p);
            this.guardarCarrito();
            this.toast("Producto agregado 🛒");
        }
    },

    borrarDelCarrito: function(index) {
        this.carrito.splice(index, 1);
        this.guardarCarrito();
    },

    guardarCarrito: function() {
        localStorage.setItem('stec_cart', JSON.stringify(this.carrito));
        this.actualizarCarritoIcono();
        if(document.getElementById('modal-carrito').style.display === 'flex') {
            this.renderCarritoModal();
        }
    },

    actualizarCarritoIcono: function() {
        document.getElementById('cart-count').innerText = this.carrito.length;
    },

    renderCarritoModal: function() {
        const list = document.getElementById('carrito-items');
        list.innerHTML = "";
        let total = 0;
        this.carrito.forEach((p, i) => {
            let precio = p.precioOferta || p.precio;
            total += parseFloat(precio);
            list.innerHTML += `
                <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                    <span>${p.nombre}</span>
                    <b>S/ ${precio}</b>
                    <i class="fa-solid fa-trash" style="color:red; cursor:pointer" onclick="App.borrarDelCarrito(${i})"></i>
                </div>
            `;
        });
        document.getElementById('cart-total').innerText = `S/ ${total.toFixed(2)}`;
    },

    enviarPedido: function() {
        const nombre = document.getElementById('cliente-nombre').value;
        if(!nombre) return this.toast("Falta nombre");
        if(this.carrito.length === 0) return this.toast("Carrito vacío");

        let msg = `*PEDIDO STEC* 📦%0ACliente: ${nombre}%0A%0A`;
        let total = 0;
        this.carrito.forEach(p => {
            let pr = p.precioOferta || p.precio;
            total += parseFloat(pr);
            msg += `- ${p.nombre} (S/ ${pr})%0A`;
            // Descontar stock
            if(p.stock > 0) DataService.actualizarStock(p.id, p.stock - 1);
        });
        msg += `%0A*TOTAL: S/ ${total.toFixed(2)}*`;
        window.open(`https://wa.me/51961996631?text=${msg}`, '_blank');
        
        this.carrito = [];
        this.guardarCarrito();
        this.cerrarModal('modal-carrito');
    },

    // --- ADMIN ---

    login: function() {
        const pass = document.getElementById('admin-pass').value;
        if(pass === this.adminPass) {
            this.cerrarModal('modal-login');
            document.getElementById('panel-admin').style.display = 'block';
            this.renderAdminTable();
            this.renderAdminSlides(this.slides || []); // Pasar slides actuales si existen
        } else {
            this.toast("Clave incorrecta");
        }
    },

    isAdminVisible: function() {
        return document.getElementById('panel-admin').style.display === 'block';
    },

    crearProducto: function() {
        const n = document.getElementById('new-name').value;
        const p = document.getElementById('new-price').value;
        if(n && p) {
            const nuevo = {
                nombre: n,
                marca: document.getElementById('new-marca').value,
                categoria: document.getElementById('new-cat').value,
                precio: parseFloat(p),
                stock: parseInt(document.getElementById('new-stock').value),
                descripcion: document.getElementById('new-desc').value,
                precioOferta: 0,
                imagen: ""
            };
            DataService.crearProducto(nuevo).then(() => {
                this.toast("Creado con éxito");
                // Limpiar campos...
                document.getElementById('new-name').value = "";
                document.getElementById('new-price').value = "";
            });
        } else { this.toast("Faltan datos básicos"); }
    },

    renderAdminTable: function() {
        const tbody = document.getElementById('admin-tbody');
        tbody.innerHTML = "";
        // Ordenar por fecha (más reciente primero) - truco: los ID son timestamps
        const lista = [...this.productos].sort((a,b) => b.id - a.id);
        
        lista.forEach(p => {
            tbody.innerHTML += `
                <tr>
                    <td><b>${p.nombre}</b><br><small>${p.marca||''}</small></td>
                    <td>${p.categoria}</td>
                    <td>${p.precio}</td>
                    <td>${p.stock}</td>
                    <td style="text-align:right;">
                        <button class="action-btn btn-plus" onclick="DataService.actualizarStock(${p.id}, ${p.stock+1})">+</button>
                        <button class="action-btn btn-minus" onclick="DataService.actualizarStock(${p.id}, ${p.stock-1})">-</button>
                        <button class="action-btn btn-edit" onclick="App.prepararFoto(${p.id})"><i class="fa-solid fa-camera"></i></button>
                        <button class="action-btn btn-delete" onclick="App.borrarProducto(${p.id})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    },

    borrarProducto: function(id) {
        if(confirm("¿Eliminar?")) DataService.borrarProducto(id);
    },

    // --- UTILIDADES UI ---
    
    toast: function(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.className = "show";
        setTimeout(() => t.className = t.className.replace("show", ""), 3000);
    },

    filtrar: function(cat) {
        this.filtroCategoria = cat;
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');
        this.renderTienda();
    },

    // Modales
    irAlLogin: () => document.getElementById('modal-login').style.display = 'flex',
    verCarrito: () => { document.getElementById('modal-carrito').style.display = 'flex'; App.renderCarritoModal(); },
    cerrarModal: (id) => document.getElementById(id).style.display = 'none',
    salirAdmin: () => document.getElementById('panel-admin').style.display = 'none',

    // Fotos
    prepararFoto: function(id) {
        this.idTemp = id;
        document.getElementById('subirImagenModal').style.display = 'flex';
    },
    
    confirmarCambioImagen: function() {
        const input = document.getElementById('archivoEditarInput');
        if(input.files.length > 0) {
            const reader = new FileReader();
            reader.onload = (e) => {
                DataService.actualizarImagen(this.idTemp, e.target.result);
                this.cerrarModal('subirImagenModal');
                this.toast("Imagen subida");
            };
            reader.readAsDataURL(input.files[0]);
        }
    },

    // Slides Admin
    guardarSlide: function() {
        const f = document.getElementById('slide-file');
        const t = document.getElementById('slide-text').value;
        if(f.files.length > 0) {
            const r = new FileReader();
            r.onload = (e) => {
                DataService.guardarSlide(e.target.result, t);
                this.toast("Banner subido");
                f.value = "";
            };
            r.readAsDataURL(f.files[0]);
        }
    },
    
    renderAdminSlides: function(lista) {
        const div = document.getElementById('lista-slides-admin');
        if(!div) return;
        div.innerHTML = "";
        lista.forEach(s => {
            div.innerHTML += `
                <div style="display:inline-block; position:relative; margin:5px;">
                    <img src="${s.imagen}" style="height:50px; border-radius:5px;">
                    <span onclick="DataService.borrarSlide(${s.id})" style="position:absolute; top:0; right:0; background:red; color:white; cursor:pointer; border-radius:50%; width:20px; height:20px; text-align:center; line-height:20px;">&times;</span>
                </div>
            `;
        });
    }
};

// --- INICIAR ---
// Exponemos funciones necesarias al HTML (Window)
window.filtrar = (c) => App.filtrar(c);
window.buscarProductoCliente = () => App.renderTienda();
window.verCarrito = () => App.verCarrito();
window.irAlLogin = () => App.irAlLogin();
window.cerrarModal = (id) => App.cerrarModal(id);
window.login = () => App.login();
window.salirAdmin = () => App.salirAdmin();
window.crearProducto = () => App.crearProducto();
window.cambiarStock = (id, v) => DataService.actualizarStock(id, v);
window.borrarProducto = (id) => App.borrarProducto(id);
window.prepararFoto = (id) => App.prepararFoto(id);
window.confirmarCambioImagen = () => App.confirmarCambioImagen();
window.guardarSlide = () => App.guardarSlide();
window.agregarCarrito = (id) => App.agregarCarrito(id);
window.borrarDelCarrito = (i) => App.borrarDelCarrito(i);
window.enviarPedido = () => App.enviarPedido();

// Arrancar
document.addEventListener('DOMContentLoaded', () => App.init());