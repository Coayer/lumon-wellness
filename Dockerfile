FROM nginx:latest
COPY ./nginx.conf /etc/nginx/nginx.conf
COPY ./www /usr/share/nginx/html

ARG IDENTITY=anon
ENV IDENTITY=${IDENTITY}

RUN if [ "$IDENTITY" = "anon" ]; then \
        sed -i 's/.*\/\/ IDENTITY_TEXT/    bufferContext.fillText("COLD HARBOR v25.00 (BUILD)", 25, 235);/' /usr/share/nginx/html/js/crt.js; \
        sed -i 's/.*\/\/ IDENTITY_LINK/    if (clickX < 0.38 \&\& clickY > 0.84) {\n        window.open("https:\/\/copey.dev", "_blank");\n    }/' /usr/share/nginx/html/js/crt.js; \
    elif [ "$IDENTITY" = "public" ]; then \
        sed -i 's/.*\/\/ IDENTITY_TEXT/    bufferContext.fillText("Made by Copeland R.", 25, 235);\n    drawLine(71, 239, 132, 239, 0.5);/' /usr/share/nginx/html/js/crt.js; \
        sed -i 's/listen 80;/listen 8080;/' /etc/nginx/nginx.conf; \
    fi
