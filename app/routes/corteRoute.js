const express = require('express');
const router = express.Router();
const path = require('path');
const moment = require('moment-timezone');
const { Corte } = require(path.join(__dirname, '../controllers/schemas', 'corteSchema.js'));
const { HTTP } = require(path.join(__dirname, '../config', 'config.js'))


// GET Base
router.get('/', (req, res) => {
  res.status(HTTP.OK).send('Página de corte');
});

// GET Details
router.get('/details', (req, res) => {
  res.status(HTTP.OK).send('Detalle de corte');
});

// GET Data
router.get('/data', (req, res) => {
    Corte.find({})
    .then((cortes) => {
        res.status(HTTP.FOUND).json(cortes);
    })
    .catch((error) => {
        console.error(error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Error al obtener los cortes' });
    });
});

// GET Corte By RCC
router.get('/rcc/:rcc', (req, res) => {
    const rcc = req.params.rcc;

    Corte.findOne({ RCC: rcc })
    .then((corte) => {
        if (!corte) {
        return res.status(HTTP.BAD_REQUEST).json({ error: 'RCC Mal escrito o no encontrado.' });
        }

        res.status(HTTP.FOUND).json(corte);
    })
    .catch((error) => {
        console.error(error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Error al obtener el corte' });
    });
});

// GET Corte Between RCC
router.get('/rcc', (req, res) => {
    const rcc1 = req.query.rcc1;
    const rcc2 = req.query.rcc2;
  
    Corte.find({ RCC: { $gte: rcc1, $lte: rcc2 } })
    .then((cortes) => {
        if (cortes.length === 0) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'RCC Mal escrito o no encontrado.' });
        }

        res.status(HTTP.FOUND).json(cortes);
    })
    .catch((error) => {
        console.error(error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Error al obtener los cortes' });
    });
});

// GET Corte By Date
router.get('/date/:date', (req, res) => {
    const date = req.params.date;

    try {
        const fechaInicio = moment.tz(date, 'America/Los_Angeles').startOf('day').toDate();
        const fechaFin = moment.tz(date, 'America/Los_Angeles').endOf('day').toDate();

        Corte.find({ fechaHora: { $gte: fechaInicio, $lte: fechaFin } })
        .then((cortes) => {
            res.status(HTTP.FOUND).json(cortes);
        })
        .catch((error) => {
            console.error(error);
            res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Error al obtener los cortes' });
        });
    } catch (error) {
        return res.status(HTTP.BAD_REQUEST).json({ error: 'Formato de fecha inválido. Utiliza el formato YYYY-MM-DD' });
    }
});

// GET Corte Between Dates
router.get('/date', (req, res) => {
    const date1 = req.query.date1;
    const date2 = req.query.date2;

    try {
        const fechaInicio = moment.tz(date1, 'America/Los_Angeles');
        const fechaFin = moment.tz(date2, 'America/Los_Angeles').endOf('day');

        Corte.find({ fechaHora: { $gte: fechaInicio.toDate(), $lt: fechaFin.toDate() } })
        .then((cortes) => {
            res.status(HTTP.FOUND).json(cortes);
        })
        .catch((error) => {
            console.error(error);
            res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Error al obtener los cortes' });
        });
    } catch (error) {
        return res.status(HTTP.BAD_REQUEST).json({ error: 'Formato de fecha inválido. Utiliza el formato YYYY-MM-DD' });
    }
});

// GET Chart Data Between Dates
router.get('/chart-data', (req, res) => {
    const date1 = req.query.date1;
    const date2 = req.query.date2;

    try {
        const fechaInicio = moment.tz(date1, 'America/Los_Angeles').startOf('day').toDate();
        const fechaFin = moment.tz(date2, 'America/Los_Angeles').endOf('day').toDate();

        Corte.find({ fechaHora: { $gte: fechaInicio, $lte: fechaFin } })
        .then((cortes) => {
            const chartData = new Map();
            const matutinoData = new Map();
            const vespertinoData = new Map();

            cortes.forEach((corte) => {
                const corteFecha = moment.tz(corte.fechaHora, 'America/Los_Angeles');
                const corteFechaFormatted = corteFecha.format('YYYY-MM-DD');
                const corteHora = corteFecha.hour();
                const totalSistema = corte.totalSistema;

                if (corteHora < 18) {
                    // Corte del turno matutino
                    if (matutinoData.has(corteFechaFormatted)) {
                        matutinoData.set(corteFechaFormatted, matutinoData.get(corteFechaFormatted) + totalSistema);
                    } else {
                        matutinoData.set(corteFechaFormatted, totalSistema);
                    }
                } else {
                // Corte del turno vespertino
                    if (vespertinoData.has(corteFechaFormatted)) {
                        vespertinoData.set(corteFechaFormatted, vespertinoData.get(corteFechaFormatted) + totalSistema);
                    } else {
                        vespertinoData.set(corteFechaFormatted, totalSistema);
                    }
                }

                if (chartData.has(corteFechaFormatted)) {
                    chartData.set(corteFechaFormatted, chartData.get(corteFechaFormatted) + totalSistema);
                } else {
                    chartData.set(corteFechaFormatted, totalSistema);
                }
            });

            const labels = Array.from(chartData.keys());
            const data = Array.from(chartData.values());
            const matutino = Array.from(matutinoData.values());
            const vespertino = Array.from(vespertinoData.values());

            const chartDataResult = {
                labels: labels,
                data: data,
                matutino: matutino,
                vespertino: vespertino,
            };

            res.status(HTTP.OK).json(chartDataResult);
        })
        .catch((error) => {
            console.error(error);
            res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Error al obtener los datos para la gráfica' });
        });
    } catch (error) {
        return res.status(HTTP.BAD_REQUEST).json({ error: 'Formato de fecha inválido. Utiliza el formato YYYY-MM-DD' });
    }
});
  
// GET Accumulated Data for a Month
router.get('/accumulated-data', (req, res) => {
    const { date } = req.query;

    try {
        const fechaInicio = moment.tz(date, 'America/Los_Angeles').startOf('month').toDate();
        const fechaFin = moment.tz(date, 'America/Los_Angeles').endOf('month').toDate();

        Corte.aggregate([
        {
            $match: {
            fechaHora: { $gte: fechaInicio, $lte: fechaFin },
            },
        },
        {
            $group: {
                _id: null,
                dolaresEfectivo: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $ne: ['$dolares.TC', 0] },
                                    { $ne: ['$dolares.efectivo', 0] }
                                ]
                            },
                            { $multiply: ['$dolares.TC', '$dolares.efectivo'] }, 0
                        ]
                    }
                },
                totalEfectivo: { $sum: '$totalEfectivo' },
                tarjeta: { $sum: '$tarjeta' },
            },
        },
        ])
        .then((result) => {
            const accumulatedData = result[0] || {
                dolaresEfectivo: 0,
                totalEfectivo: 0,
                tarjeta: 0,
            };

            res.status(HTTP.OK).json(accumulatedData);
        })
        .catch((error) => {
            console.error(error);
            res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Error al obtener los datos acumulados' });
        });
    } catch (error) {
        return res.status(HTTP.BAD_REQUEST).json({ error: 'Formato de fecha inválido. Utiliza el formato YYYY-MM-DD' });
    }
});

module.exports = router;
