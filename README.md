#  Keywords CV Matcher (Zero-Server AI) 

¡Optimiza tu currículum usando Inteligencia Artificial 100% en tu navegador! Sin servidores, sin comprometer tu privacidad.

##  Características
- **Zero-Server AI**: Procesamiento Semántico con `Transformers.js` (Hugging Face) en local. Tus datos NUNCA salen de tu PC.
- **Motor Híbrido**: Búsqueda exacta (Fuse.js) + Similitud de Coseno (all-MiniLM-L6-v2) para comprender variaciones conceptuales ("Coches" vs "Automóviles").
- **Feedback Proactivo**: Sugerencias de redacción generadas por IA (Flan-T5) y detección de "leibilidad" ATS para evitar CVs excesivamente densos.
- **Diccionario Tech**: Mapeo automático de sinónimos y siglas.

##  Arquitectura
1. **PDF.js**: Extracción segura del texto del CV en local (vía Web Worker).
2. **Fuse.js**: Match difuso para detección rápida de palabras exactas.
3. **Transformers.js**: Modelos Hugging Face (all-MiniLM y Flan-T5) corriendo en WebAssembly.
4. **IndexedDB**: Cacheado automático de los modelos IA (descarga de 20-40MB una sola vez).

##  Cómo usarlo
1. Abre el `index.html` en un navegador web moderno (Edge, Chrome, Firefox).
2. Espera unos segundos la primera vez que entres, el sistema estará inicializando y descargando los modelos de IA en la caché de tu navegador.
3. Pega la descripción de la oferta y sube tu PDF.
4. ¡Analiza y descubre las sugerencias de redacción impulsadas por IA!
5. Exporta un reporte en PDF.
