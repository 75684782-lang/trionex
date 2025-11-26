// js/data.js

const DataService = {
    // Rutas de la base de datos
    RUTAS: {
        PRODUCTOS: 'stec_inventario',
        CARRUSEL: 'stec_carrusel',
        CONFIG: 'stec_config'
    },

    // LEER DATOS (Suscripción en tiempo real)
    escucharProductos: function(callback) {
        if (!db) return;
        db.ref(this.RUTAS.PRODUCTOS).on('value', (snapshot) => {
            const data = snapshot.val();
            const lista = data ? Object.values(data) : [];
            callback(lista); // Le pasa los datos al Frontend
        });
    },

    escucharCarrusel: function(callback) {
        if (!db) return;
        db.ref(this.RUTAS.CARRUSEL).on('value', (snapshot) => {
            const data = snapshot.val();
            const lista = data ? Object.values(data) : [];
            callback(lista);
        });
    },

    obtenerPassword: function(callback) {
        if (!db) return;
        db.ref(this.RUTAS.CONFIG + '/adminPass').on('value', (s) => {
            if(s.val()) callback(s.val());
        });
    },

    // ACCIONES (CRUD)
    crearProducto: function(producto) {
        const id = Date.now();
        producto.id = id; // Asignar ID automático
        return db.ref(this.RUTAS.PRODUCTOS + '/' + id).set(producto);
    },

    borrarProducto: function(id) {
        return db.ref(this.RUTAS.PRODUCTOS + '/' + id).remove();
    },

    actualizarStock: function(id, nuevoStock) {
        return db.ref(this.RUTAS.PRODUCTOS + '/' + id + '/stock').set(nuevoStock);
    },

    actualizarOferta: function(id, precio) {
        return db.ref(this.RUTAS.PRODUCTOS + '/' + id + '/precioOferta').set(precio);
    },

    actualizarImagen: function(id, base64) {
        return db.ref(this.RUTAS.PRODUCTOS + '/' + id + '/imagen').set(base64);
    },

    guardarSlide: function(imagen, texto) {
        const id = Date.now();
        return db.ref(this.RUTAS.CARRUSEL + '/' + id).set({ id, imagen, texto });
    },

    borrarSlide: function(id) {
        return db.ref(this.RUTAS.CARRUSEL + '/' + id).remove();
    },

    cambiarPassword: function(nuevaClave) {
        return db.ref(this.RUTAS.CONFIG + '/adminPass').set(nuevaClave);
    }
};