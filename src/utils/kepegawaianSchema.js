/**
 * kepegawaianSchema.js
 * Structure and calculations for Laporan Bezetting Pegawai
 */

// Detail list rows structure
export const getEmptyPegawaiRow = () => ({
    id: Date.now() + Math.random().toString(36).substring(2, 9),
    nama: '',
    nip: '',
    jenis_kelamin: '',
    jabatan: '',
    eselon: '',
    pangkat_gol: '',
    tmt_gol: '',
    pendidikan: '',
    diklat_teknis: '',
    diklat_lainnya: '',
    keterangan: ''
});

export const getEmptyPPPKRow = () => ({
    id: Date.now() + Math.random().toString(36).substring(2, 9),
    nama_lengkap: '',
    tl_kode: '',
    tl_nama: '',
    tgl_lahir: '',
    jk: '',
    pend_kode: '',
    pend_nama: '',
    jab_kode: '',
    jab_nama: 'PPPK',
    unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR'
});

export const getEmptyNonAsnRow = () => ({
    id: Date.now() + Math.random().toString(36).substring(2, 9),
    nama_lengkap: '',
    tl_kode: '',
    tl_nama: '',
    tgl_lahir: '',
    jk: '',
    pend_kode: '',
    pend_nama: '',
    jab_kode: '',
    jab_nama: 'PPNPN',
    unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR'
});

export const DEFAULT_PEGAWAI_DATA = [
    { nama: 'Benyamin Kali Patembal Harahap, S.H, M.M', nip: '198205112001121001', jenis_kelamin: 'LK', jabatan: 'Kepala Kantor', eselon: 'III/b', pangkat_gol: 'IV/a', tmt_gol: '01-04-23', pendidikan: 'Magister Manajemen', diklat_teknis: 'PPNS', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Ahmad Arif Hiya, S.H, M.H', nip: '198604212006041001', jenis_kelamin: 'LK', jabatan: 'Kasi Teknologi Informasi dan Komunikasi', eselon: '-', pangkat_gol: 'III/c', tmt_gol: '01-10-24', pendidikan: 'Magister Hukum', diklat_teknis: 'PPNS', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Erwan Budiawan, S.H.', nip: '198302052009121007', jenis_kelamin: 'LK', jabatan: 'Kasi Intelijen dan Penindakan Keimigrasian', eselon: 'IV.b', pangkat_gol: 'III/b', tmt_gol: '01-06-24', pendidikan: 'Sarjana Hukum', diklat_teknis: 'PPNS', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Leonyta Rotua, SE., MH', nip: '198707302007011005', jenis_kelamin: 'PR', jabatan: 'Kasi Lalu Lintas dan Izin Tinggal Keimigrasian', eselon: 'IV.b', pangkat_gol: 'III/d', tmt_gol: '30-05-24', pendidikan: 'Sarjana Hukum', diklat_teknis: 'PTK', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Imam Suroso, S.H.', nip: '199506252019011001', jenis_kelamin: 'LK', jabatan: 'Kasubsi Lalu Lintas Keimigrasian', eselon: 'V', pangkat_gol: 'III/b', tmt_gol: '-', pendidikan: 'Sarjana Hukum', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Timoria Damanik, SH', nip: '197002031999032001', jenis_kelamin: 'PR', jabatan: 'Kepala Sub Bag Tata Usaha', eselon: 'IV.b', pangkat_gol: 'III/c', tmt_gol: '01-10-21', pendidikan: 'Sarjana Hukum', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Nurhasanah, SS', nip: '198012282009122002', jenis_kelamin: 'PR', jabatan: 'Pengelola Data Keuangan', eselon: '-', pangkat_gol: 'III/d', tmt_gol: '01-04-21', pendidikan: 'Sarjana Sastra', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Arief Budi Prasetyo, S.H.,M.M.', nip: '198804172012121002', jenis_kelamin: 'LK', jabatan: 'Kasubsi Teknologi Informasi Keimigrasian', eselon: 'V', pangkat_gol: 'III/b', tmt_gol: '-', pendidikan: 'Magister Manajemen', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Suswan Edy Patra, S.E,M.H', nip: '198206222005011003', jenis_kelamin: 'LK', jabatan: 'Kasubsi IzinTinggal Keimigrasian', eselon: 'V', pangkat_gol: '-', tmt_gol: '01-04-24', pendidikan: 'Magister Hukum', diklat_teknis: 'PPNS', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Sondang Bethesda Pasaribu,SS', nip: '198805092012122001', jenis_kelamin: 'PR', jabatan: 'Kepala Urusan Keuangan', eselon: 'V', pangkat_gol: 'III/c', tmt_gol: '01-04-21', pendidikan: 'Sarjana Sastra', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Juanto Jarwadin Sinaga, SH', nip: '197709131998031001', jenis_kelamin: 'LK', jabatan: 'Pengelola Data Seksi Penindakan Keimigrasian', eselon: '-', pangkat_gol: 'III/c', tmt_gol: '01-04-22', pendidikan: 'Sarjana Hukum', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Wiro Sinaga', nip: '196907271999041001', jenis_kelamin: 'LK', jabatan: 'Pengelola Data Keimigrasian Seksi Lalintalkim', eselon: '-', pangkat_gol: 'III/b', tmt_gol: '01-04-19', pendidikan: 'SLTA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Tengku Ezy Andika, S.E.', nip: '199409082017121001', jenis_kelamin: 'LK', jabatan: 'Kasubsi Penindakan Keimigrasian', eselon: 'V', pangkat_gol: 'III/b', tmt_gol: '-', pendidikan: 'Sarjana Ekonomi', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Sofyan Ansori Tondang, SE', nip: '198402022010011001', jenis_kelamin: 'LK', jabatan: 'Kepala Urusan Umum', eselon: 'V', pangkat_gol: 'III/c', tmt_gol: '01-04-24', pendidikan: 'Sarjana Ekonomi', diklat_teknis: '-', diklat_lainnya: 'Barjas (Basic/ L4)', keterangan: '-' },
    { nama: '-', nip: '-', jenis_kelamin: '-', jabatan: 'Kasubsi Infokom', eselon: 'V', pangkat_gol: '-', tmt_gol: '-', pendidikan: '-', diklat_teknis: '-', diklat_lainnya: '-', keterangan: 'Kosong' },
    { nama: 'Irwan Saud, ST', nip: '197404082002121001', jenis_kelamin: 'LK', jabatan: 'Analis Keimigrasian', eselon: 'IV.b', pangkat_gol: 'III/d', tmt_gol: '01-10-17', pendidikan: 'Sarjana Hukum', diklat_teknis: 'PTK', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Totonato Gulo', nip: '196901161999031001', jenis_kelamin: 'LK', jabatan: 'Pengelola Data Keimigrasian Seksi Lalintalkim', eselon: '-', pangkat_gol: 'III/b', tmt_gol: '01-04-20', pendidikan: 'SMA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Sry Rahayu, SH', nip: '197001192000032001', jenis_kelamin: 'PR', jabatan: 'Pengelola Data Keimigrasian Seksi Lalintalkim', eselon: '-', pangkat_gol: 'III/c', tmt_gol: '01-04-24', pendidikan: 'Sarjana Hukum', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Septian Yubil S Sihombing, A.Md, SE', nip: '198809262010011017', jenis_kelamin: 'LK', jabatan: 'Bendahara Pengeluaran', eselon: '-', pangkat_gol: 'III/b', tmt_gol: '01-10-22', pendidikan: 'Sarjana Ekonomi', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Rahmat Fadli, SH', nip: '198504022009121011', jenis_kelamin: 'LK', jabatan: 'Penyusun laporan Keuangan/ Operator SAIBA', eselon: '-', pangkat_gol: 'III/c', tmt_gol: '01-04-24', pendidikan: 'Sarjana Hukum', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'RIO ERIKSON SINURAT, S.Tr.Im.', nip: '199807172022011001', jenis_kelamin: 'LK', jabatan: 'Kasubsi Intelijen', eselon: 'V', pangkat_gol: 'III/b', tmt_gol: '01-01-26', pendidikan: 'Strata 1', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Mardiah, SM', nip: '198203212009012004', jenis_kelamin: 'PR', jabatan: 'Pengelola Data Keimigrasian Seksi Lalintalkim', eselon: '-', pangkat_gol: 'III/b', tmt_gol: '01-04-21', pendidikan: 'Sarjana Manajemen', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Ricky Anggriawan, ST', nip: '199201292017121002', jenis_kelamin: 'LK', jabatan: 'Analis Keimigrasian', eselon: '-', pangkat_gol: 'III/b', tmt_gol: '01-12-17', pendidikan: 'Sarjana Teknik', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Dwi Rizki Ananda, S.Kom', nip: '199207252017121001', jenis_kelamin: 'LK', jabatan: 'Analis Keimigrasian', eselon: '-', pangkat_gol: 'III/b', tmt_gol: '01-12-17', pendidikan: 'Sarjana Komputer', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Taufiq Adha S,SH', nip: '198907132017121002', jenis_kelamin: 'LK', jabatan: 'Analis Keimigrasian', eselon: '-', pangkat_gol: 'III/a', tmt_gol: '01-12-17', pendidikan: 'Sarjana Hukum', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Welperic Fransiscus Manullang, SE', nip: '199004232017121001', jenis_kelamin: 'LK', jabatan: 'Analis Keimigrasian', eselon: '-', pangkat_gol: 'III/a', tmt_gol: '01-12-17', pendidikan: 'Sarjana Ekonomi', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Agus Sutrisno Siahaan, S.Sos', nip: '199108012017121002', jenis_kelamin: 'LK', jabatan: 'Analis Keimigrasian', eselon: '-', pangkat_gol: 'III/a', tmt_gol: '01-12-17', pendidikan: 'Sarjana Sosial', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'MHD. Dhanie Rachman Pasaribu, SE', nip: '199307242017121002', jenis_kelamin: 'LK', jabatan: 'Analis Keimigrasian', eselon: '-', pangkat_gol: 'III/a', tmt_gol: '01-12-17', pendidikan: 'Sarjana Ekonomi', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Ruhut Trifosa Sitompul, SH', nip: '199602082017121001', jenis_kelamin: 'LK', jabatan: 'Analis Keimigrasian', eselon: '-', pangkat_gol: 'III/a', tmt_gol: '01-12-17', pendidikan: 'Sarjana Hukum', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Reza Fiezri Lubis, S.Kom', nip: '199003162017121001', jenis_kelamin: 'LK', jabatan: 'Analis Keimigrasian', eselon: '-', pangkat_gol: 'III/a', tmt_gol: '01-12-17', pendidikan: 'Sarjana Komputer', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Tohom Marthin Donius Pasaribu, SS', nip: '198912032017121001', jenis_kelamin: 'LK', jabatan: 'Analis Keimigrasian', eselon: '-', pangkat_gol: 'III/a', tmt_gol: '01-12-17', pendidikan: 'Sarjana Sastra', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Juan Arthur Rumahorbo,S.Kom', nip: '199306042017121002', jenis_kelamin: 'LK', jabatan: 'Analis Keimigrasian', eselon: '-', pangkat_gol: 'III/b', tmt_gol: '01-12-17', pendidikan: 'Sarjana Komputer', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Leo Ronald Togu M Sitorus, A.Md', nip: '198208022010011016', jenis_kelamin: 'LK', jabatan: 'Pengelola BMN/ Operator BMN', eselon: '-', pangkat_gol: 'III/b', tmt_gol: '01-10-22', pendidikan: 'D III', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Vien Marlan Purba', nip: '197909202001121001', jenis_kelamin: 'LK', jabatan: 'Kaur Kepegawaian', eselon: '-', pangkat_gol: 'III/b', tmt_gol: '01-04-22', pendidikan: 'SLTA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Boyke Nanda Agustinus, A.Md', nip: '198508042009121007', jenis_kelamin: 'LK', jabatan: 'Bendahara Penerima', eselon: '-', pangkat_gol: 'III/b', tmt_gol: '01-04-22', pendidikan: 'D III', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Aprilian Sari Lubis, A.Md', nip: '198404242009042008', jenis_kelamin: 'PR', jabatan: 'Pengelola Data Kepegawaian', eselon: '-', pangkat_gol: 'III/b', tmt_gol: '01-10-22', pendidikan: 'D III', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Erik Jonito Malem, A.Md', nip: '198307312009041001', jenis_kelamin: 'LK', jabatan: 'Pengelola Data Kepegawaian', eselon: '-', pangkat_gol: 'III/b', tmt_gol: '01-10-22', pendidikan: 'D III', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Frima Yusri Efani, A.Md', nip: '198701312010011010', jenis_kelamin: 'LK', jabatan: 'Pengelola Data Keimigrasian Sub.S Lalintalkim', eselon: '-', pangkat_gol: 'III/b', tmt_gol: '01-10-22', pendidikan: 'D III', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Dian Nita Ginting, SM', nip: '199007092015032004', jenis_kelamin: 'PR', jabatan: 'Pengelola Data Keimigrasian Sub Seksi Penindakan', eselon: '-', pangkat_gol: 'III/a', tmt_gol: '01-04-22', pendidikan: 'Sarjana Manajemen', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Firman Suranta', nip: '199207082020121001', jenis_kelamin: 'LK', jabatan: 'Pemeriksa Keimigrasian Pemula', eselon: '-', pangkat_gol: 'II/a', tmt_gol: '01-12-20', pendidikan: 'SMA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Arga Winata', nip: '200007242020121002', jenis_kelamin: 'LK', jabatan: 'Pemeriksa Keimigrasian Pemula', eselon: '-', pangkat_gol: 'II/a', tmt_gol: '01-12-20', pendidikan: 'SMA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Evrina Syahputri', nip: '200107132020122001', jenis_kelamin: 'PR', jabatan: 'Pemeriksa Keimigrasian Pemula', eselon: '-', pangkat_gol: 'II/b', tmt_gol: '01-12-20', pendidikan: 'SMA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: 'BKO' },
    { nama: 'Dimas Aditya Wibawa', nip: '200102262025021001', jenis_kelamin: 'LK', jabatan: 'Analis Keimigrasian Ahli Pertama', eselon: '-', pangkat_gol: 'III/a', tmt_gol: '-', pendidikan: 'S.Tr.IM', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Afsal Hilal Hamdi', nip: '200208262025021001', jenis_kelamin: 'LK', jabatan: 'Analis Keimigrasian Ahli Pertama', eselon: '-', pangkat_gol: 'III/a', tmt_gol: '-', pendidikan: 'S.Tr.IM', diklat_teknis: '-', diklat_lainnya: '-', keterangan: 'BKO' },
    { nama: 'Bagus Satrio Utomo', nip: '200106212025021001', jenis_kelamin: 'LK', jabatan: 'Analis Keimigrasian Ahli Pertama', eselon: '-', pangkat_gol: 'III/a', tmt_gol: '-', pendidikan: 'S.Tr.IM', diklat_teknis: '-', diklat_lainnya: '-', keterangan: 'BKO' },
    { nama: 'Sandhi Yudiansyah', nip: '199809012025061010', jenis_kelamin: 'LK', jabatan: 'Pemeriksa Keimigrasian Pemula', eselon: '-', pangkat_gol: 'II/a', tmt_gol: '01-06-25', pendidikan: 'SMA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Abdul Malik Chairuddin', nip: '200505112025061006', jenis_kelamin: 'LK', jabatan: 'Pemeriksa Keimigrasian Pemula', eselon: '-', pangkat_gol: 'II/a', tmt_gol: '01-06-25', pendidikan: 'SMA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Faudi Ansyah Harahap', nip: '200608242025061001', jenis_kelamin: 'LK', jabatan: 'Pemeriksa Keimigrasian Pemula', eselon: '-', pangkat_gol: 'II/a', tmt_gol: '01-06-25', pendidikan: 'SMA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Sanjaya Ramos Sianipar', nip: '200607042025061001', jenis_kelamin: 'LK', jabatan: 'Pemeriksa Keimigrasian Pemula', eselon: '-', pangkat_gol: 'II/a', tmt_gol: '01-06-25', pendidikan: 'SMA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Muhammad Al-Imam Andrea', nip: '200607042025061004', jenis_kelamin: 'LK', jabatan: 'Pemeriksa Keimigrasian Pemula', eselon: '-', pangkat_gol: 'II/a', tmt_gol: '01-06-25', pendidikan: 'SMA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Yudha Yudistira', nip: '200112052025061005', jenis_kelamin: 'LK', jabatan: 'Pemeriksa Keimigrasian Pemula', eselon: '-', pangkat_gol: 'II/a', tmt_gol: '01-06-25', pendidikan: 'SMA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Alfian M. J. Silaban', nip: '199406022025061007', jenis_kelamin: 'LK', jabatan: 'Pemeriksa Keimigrasian Pemula', eselon: '-', pangkat_gol: 'II/a', tmt_gol: '01-06-25', pendidikan: 'SMA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Widya Febry Taharah', nip: '200302142025062006', jenis_kelamin: 'PR', jabatan: 'Pemeriksa Keimigrasian Pemula', eselon: '-', pangkat_gol: 'II/a', tmt_gol: '01-06-25', pendidikan: 'SMA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Vina Afri Liana', nip: '200104072025062012', jenis_kelamin: 'PR', jabatan: 'Pemeriksa Keimigrasian Pemula', eselon: '-', pangkat_gol: 'II/a', tmt_gol: '01-06-25', pendidikan: 'SMA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Zaskia Najwa Abli Sitompul', nip: '200605032025062002', jenis_kelamin: 'PR', jabatan: 'Pemeriksa Keimigrasian Pemula', eselon: '-', pangkat_gol: 'II/a', tmt_gol: '01-06-25', pendidikan: 'SMA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Viona Fatrisia Barimbing', nip: '200309172025062005', jenis_kelamin: 'PR', jabatan: 'Pemeriksa Keimigrasian Pemula', eselon: '-', pangkat_gol: 'II/a', tmt_gol: '01-06-25', pendidikan: 'SMA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Nova Roitonta Limbong', nip: '200011272025062011', jenis_kelamin: 'PR', jabatan: 'Pemeriksa Keimigrasian Pemula', eselon: '-', pangkat_gol: 'II/a', tmt_gol: '01-06-25', pendidikan: 'SMA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Dian Hakiki', nip: '200112152025062011', jenis_kelamin: 'PR', jabatan: 'Pemeriksa Keimigrasian Pemula', eselon: '-', pangkat_gol: 'II/a', tmt_gol: '01-06-25', pendidikan: 'SMA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' },
    { nama: 'Brenda Angelica Mawarni Srg', nip: '200207312025062012', jenis_kelamin: 'PR', jabatan: 'Pemeriksa Keimigrasian Pemula', eselon: '-', pangkat_gol: 'II/a', tmt_gol: '01-06-25', pendidikan: 'SMA', diklat_teknis: '-', diklat_lainnya: '-', keterangan: '-' }
].map((item, idx) => ({ ...item, id: `pkg_${idx}_${Date.now()}` }));

export const DEFAULT_PPPK_DATA = [
    { nama_lengkap: 'JAMES WILLIAM MANURUNG', tl_kode: '12.72', tl_nama: 'PEMATANG SIANTAR', tgl_lahir: '30-05-1999', jk: 'L', pend_kode: '101', pend_nama: 'SMA IPA', jab_kode: '', jab_nama: 'PPPK', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'JULIO EGLISES PARULIAN ARITONANG', tl_kode: '12.18', tl_nama: 'SERDANG BEDAGAI', tgl_lahir: '01-08-1990', jk: 'L', pend_kode: '101', pend_nama: 'SMA IPS', jab_kode: '', jab_nama: 'PPPK', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTARR' },
    { nama_lengkap: 'KASIMURI GULO', tl_kode: '12.04', tl_nama: 'NIAS SELATAN', tgl_lahir: '06-09-1981', jk: 'L', pend_kode: '7171 K13 REV', pend_nama: 'SMK ELEKTRONIKA KOMUNIKASI', jab_kode: '', jab_nama: 'PPPK', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'MARGARETH PUTRI MANULLANG', tl_kode: '12.71', tl_nama: 'MEDAN', tgl_lahir: '13-02-1994', jk: 'P', pend_kode: '70232', pend_nama: 'BIMBINGAN DAN KONSELING', jab_kode: '', jab_nama: 'PPPK', unit_kerja: 'ULP TEBING TINGGI KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'SINDY SUMIATI PURBA', tl_kode: '12.08', tl_nama: 'SIMALUNGUN', tgl_lahir: '01-06-2000', jk: 'P', pend_kode: '3014 K06', pend_nama: 'SMK KEPERAWATAN', jab_kode: '', jab_nama: 'PPPK', unit_kerja: 'ULP TEBING TINGGI KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'TRIO ARDHI LESMANA', tl_kode: '12.72', tl_nama: 'PEMATANG SIANTAR', tgl_lahir: '03-10-1989', jk: 'P', pend_kode: '101', pend_nama: 'SMA IPS', jab_kode: '', jab_nama: 'PPPK', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'DWI SHINTYA', tl_kode: '12.72', tl_nama: 'PEMATANG SIANTAR', tgl_lahir: '16-03-1997', jk: 'P', pend_kode: '74201', pend_nama: 'SARJANA HUKUM', jab_kode: '', jab_nama: 'PPPK', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'ISWANDI PRATAYUDA', tl_kode: '12.18', tl_nama: 'SERDANG BEDAGAI', tgl_lahir: '26-02-1990', jk: 'L', pend_kode: '101', pend_nama: 'SMA IPS', jab_kode: '', jab_nama: 'PPPK', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'CANDRA AGUSBIYANTO', tl_kode: '12.76', tl_nama: 'TEBING TINGGI', tgl_lahir: '16-08-1988', jk: 'L', pend_kode: '101', pend_nama: 'SMA IPA', jab_kode: '', jab_nama: 'PPPK', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'NOVITA DEBORA ARITONANG', tl_kode: '12.72', tl_nama: 'PEMATANG SIANTAR', tgl_lahir: '08-10-1994', jk: 'P', pend_kode: '101', pend_nama: 'SMA IPS', jab_kode: '', jab_nama: 'PPPK', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' }
].map((item, idx) => ({ ...item, id: `ppk_${idx}_${Date.now()}` }));

export const DEFAULT_NON_ASN_DATA = [
    { nama_lengkap: 'THOMAS MULYAWANRI PURBA', tl_kode: '12.71', tl_nama: 'MEDAN', tgl_lahir: '19-03-2005', jk: 'L', pend_kode: '55201', pend_nama: 'SMA IPA', jab_kode: '', jab_nama: 'PPNPN', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'JUNI ALBERT PURBA', tl_kode: '12.72', tl_nama: 'PEMATANG SIANTAR', tgl_lahir: '30-06-1994', jk: 'L', pend_kode: '4337', pend_nama: 'SMK MESIN', jab_kode: '', jab_nama: 'PPNPN', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'YUNI AULIA LUMBAN TOBING', tl_kode: '12.72', tl_nama: 'PEMATANG SIANTAR', tgl_lahir: '01-05-2005', jk: 'P', pend_kode: '55201', pend_nama: 'SMA IPA', jab_kode: '', jab_nama: 'PPNPN', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'FADILA WIDYA TAMA', tl_kode: '12.08', tl_nama: 'KARANG REJO', tgl_lahir: '25-05-1997', jk: 'P', pend_kode: '61201', pend_nama: 'SARJANA MANAJEMEN', jab_kode: '', jab_nama: 'PPNPN', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'REZA AGA SATRIA SARAGIH', tl_kode: '12.72', tl_nama: 'PEMATANG SIANTAR', tgl_lahir: '03-09-1995', jk: 'L', pend_kode: '2063', pend_nama: 'SMK TKJ', jab_kode: '', jab_nama: 'PPNPN', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'DANIEL SARAGIH', tl_kode: '1209', tl_nama: 'TANJUNGBALAI', tgl_lahir: '12-08-2001', jk: 'L', pend_kode: '61201', pend_nama: 'SARJANA MANAJEMEN', jab_kode: '', jab_nama: 'PPNPN', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'JUWELTRI PAULUS SINAGA', tl_kode: '12.72', tl_nama: 'PEMATANG SIANTAR', tgl_lahir: '26-10-1992', jk: 'L', pend_kode: '61201', pend_nama: 'SARJANA MANAJEMEN', jab_kode: '', jab_nama: 'PPNPN', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'WIDYA AULIA AZZAHRA', tl_kode: '12.72', tl_nama: 'PEMATANG SIANTAR', tgl_lahir: '13-12-2000', jk: 'P', pend_kode: '70201', pend_nama: 'SARJANA ILMU KOMUNIKASI', jab_kode: '', jab_nama: 'PPNPN', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'ARIEL KASMARAN PASARIBU', tl_kode: '12.16', tl_nama: 'DOLOK SANGGUL', tgl_lahir: '15-07-2004', jk: 'L', pend_kode: '1236', pend_nama: 'SMK TEKNIK PENGELASAN', jab_kode: '', jab_nama: 'PPNPN', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'ROSWANSYAH PUTRA', tl_kode: '11.01', tl_nama: 'ACEH SELATAN', tgl_lahir: '18-08-1982', jk: 'L', pend_kode: '92403', pend_nama: 'AKADEMI MARITIM INDONESIA (D3)', jab_kode: '', jab_nama: 'PPNPN', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'JONTRA POLTAK SIBURIAN', tl_kode: '12.76', tl_nama: 'TEBING TINGGI', tgl_lahir: '20-04-1987', jk: 'L', pend_kode: '-', pend_nama: 'SMP', jab_kode: '', jab_nama: 'PPNPN', unit_kerja: 'ULP TEBING TINGGI KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'FERNANDO MARULIASI SIALLAGAN', tl_kode: '12.17', tl_nama: 'SAMOSIR', tgl_lahir: '26-09-1996', jk: 'L', pend_kode: '101', pend_nama: 'SMA IPS', jab_kode: '', jab_nama: 'PPNPN', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'SUTRISNO', tl_kode: '12.08', tl_nama: 'BERINGIN', tgl_lahir: '30-04-1990', jk: 'L', pend_kode: '-', pend_nama: 'SMA IPS', jab_kode: '', jab_nama: 'PPNPN', unit_kerja: 'KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
    { nama_lengkap: 'SALWA RAHMA SABILLA PASARIBU', tl_kode: '-', tl_nama: 'BAH JAMBI', tgl_lahir: '14-10-2003', jk: 'P', pend_kode: '-', pend_nama: 'SLTA', jab_kode: '', jab_nama: 'PPNPN', unit_kerja: 'ULP TEBING TINGGI KANTOR IMIGRASI KELAS II TPI PEMATANG SIANTAR' },
].map((item, idx) => ({ ...item, id: `nasn_${idx}_${Date.now()}` }));

// Summary Tables Definition
export const GOLONGAN_ROWS = [
    { id: 'gol_1', label: 'Golongan I' },
    { id: 'gol_2', label: 'Golongan II' },
    { id: 'gol_3', label: 'Golongan III' },
    { id: 'gol_4', label: 'Golongan IV' }
];

export const JABATAN_ROWS = [
    { id: 'kakan', label: 'Kepala Kantor' },
    { id: 'kasi', label: 'Kepala Seksi' },
    { id: 'kasubsi', label: 'Kepala Sub Seksi' },
    { id: 'staf', label: 'Staf' }
];

export const PENDIDIKAN_ROWS = [
    { id: 'sd', label: 'SD' },
    { id: 'smp', label: 'SMP' },
    { id: 'sma', label: 'SMA' },
    { id: 'd3', label: 'D3' },
    { id: 's1', label: 'S1' },
    { id: 's2', label: 'S2' },
    { id: 's3', label: 'S3' }
];

export const GENDER_ROWS = [
    { id: 'l', label: 'Laki-laki' },
    { id: 'p', label: 'Perempuan' }
];

export const STATUS_ROWS = [
    { id: 'pns', label: 'PNS' },
    { id: 'pppk', label: 'PPPK' },
    { id: 'honor', label: 'Honorer' }
];

// Helper to generate default empty numeric data
const generateDefaultNumeric = (struct) => {
    return struct.reduce((acc, row) => ({ ...acc, [row.id]: 0 }), {});
};

export const REKAPITULASI_PEGAWAI_ROWS = [
    { id: 'rek_iv', name: 'IV', pangkat_a: 1, pangkat_b: 0, pangkat_c: 0, pangkat_d: 0, teknis_lk: 0, teknis_pr: 0, non_teknis_lk: 0, non_teknis_pr: 0, struktural_lk: 0, struktural_pr: 0, non_struktural_lk: 0, non_struktural_pr: 0 },
    { id: 'rek_iii', name: 'III', pangkat_a: 11, pangkat_b: 17, pangkat_c: 8, pangkat_d: 4, teknis_lk: 9, teknis_pr: 1, non_teknis_lk: 24, non_teknis_pr: 10, struktural_lk: 8, struktural_pr: 3, non_struktural_lk: 23, non_struktural_pr: 7 },
    { id: 'rek_ii', name: 'II', pangkat_a: 16, pangkat_b: 1, pangkat_c: 0, pangkat_d: 0, teknis_lk: 0, teknis_pr: 0, non_teknis_lk: 7, non_teknis_pr: 7, struktural_lk: 0, struktural_pr: 0, non_struktural_lk: 9, non_struktural_pr: 8 },
    { id: 'rek_i', name: 'I', pangkat_a: 0, pangkat_b: 0, pangkat_c: 0, pangkat_d: 0, teknis_lk: 0, teknis_pr: 0, non_teknis_lk: 0, non_teknis_pr: 0, struktural_lk: 0, struktural_pr: 0, non_struktural_lk: 0, non_struktural_pr: 0 }
];

export const CUTI_ROWS = [
    { id: 'cuti_1', nama: 'Cuti Tahunan', jumlah: 0, ket: 'CUTI TAHUNAN' },
    { id: 'cuti_2', nama: 'Cuti Besar', jumlah: 0, ket: '' },
    { id: 'cuti_3', nama: 'Cuti Sakit', jumlah: 0, ket: '' },
    { id: 'cuti_4', nama: 'Cuti Bersalin', jumlah: 0, ket: '' },
    { id: 'cuti_5', nama: 'Cuti Alasan Penting', jumlah: 0, ket: '' },
    { id: 'cuti_6', nama: 'Cuti di Luar Tanggungan Negara', jumlah: 0, ket: '' }
];

export const PEMBINAAN_ROWS = [
    { id: 'pem_1', nama: 'Kegiatan Olah raga (senam, tenis meja dan bola volly)', ket: 'Ada' },
    { id: 'pem_2', nama: 'Pembinaan Mental (Pengajian/ Kebaktian Oikumene)', ket: 'Ada' }
];

export const TATA_USAHA_ROWS = [
    { id: 'tu_1', nama: 'Surat Masuk', jumlah: 0 },
    { id: 'tu_2', nama: 'Surat Keluar', jumlah: 0 }
];

export const getDefaultKepegawaianData = () => {
    const detail = [...DEFAULT_PEGAWAI_DATA];
    const pppk = [...DEFAULT_PPPK_DATA];
    const non_asn = [...DEFAULT_NON_ASN_DATA];

    const golData = generateDefaultNumeric(GOLONGAN_ROWS);
    const jabData = generateDefaultNumeric(JABATAN_ROWS);
    const pendData = generateDefaultNumeric(PENDIDIKAN_ROWS);
    const genData = generateDefaultNumeric(GENDER_ROWS);
    const statData = generateDefaultNumeric(STATUS_ROWS);

    statData.pns = detail.length;
    statData.pppk = pppk.length;
    statData.honor = non_asn.length;

    const countAll = (row, isPns) => {
        // Gender
        const g = (row.jk || row.jenis_kelamin || '').toUpperCase();
        if (g === 'L' || g === 'LK' || g === 'LAKI-LAKI') genData.l++;
        else if (g === 'P' || g === 'PR' || g === 'PEREMPUAN') genData.p++;

        // Pendidikan
        const p = (row.pendidikan || row.pend_nama || '').toLowerCase();
        if (p.includes('sd')) pendData.sd++;
        else if (p.includes('smp')) pendData.smp++;
        else if (p.includes('sma') || p.includes('smk') || p.includes('slta')) pendData.sma++;
        else if (p.includes('d iii') || p.includes('d3') || p.includes('akademi')) pendData.d3++;
        else if (p.includes('sarjana') || p.includes('s1') || p.includes('strata') || p.includes('s.tr')) pendData.s1++;
        else if (p.includes('magister') || p.includes('s2')) pendData.s2++;
        else if (p.includes('doktor') || p.includes('s3')) pendData.s3++;

        // Jabatan
        const j = (row.jabatan || row.jab_nama || '').toLowerCase();
        if (j.includes('kepala kantor')) jabData.kakan++;
        else if (j.includes('kasi') || (j.includes('kepala seksi') && !j.includes('sub'))) jabData.kasi++;
        else if (j.includes('kasub') || j.includes('kepala sub') || j.includes('urusan') || j.includes('kaur')) jabData.kasubsi++;
        else jabData.staf++;

        // Golongan (only for PNS)
        if (isPns) {
            const gol = row.pangkat_gol || '';
            if (gol.includes('I/') && !gol.includes('II/') && !gol.includes('III/') && !gol.includes('IV/')) golData.gol_1++;
            else if (gol.includes('II/')) golData.gol_2++;
            else if (gol.includes('III/')) golData.gol_3++;
            else if (gol.includes('IV/')) golData.gol_4++;
        }
    };

    detail.forEach(r => countAll(r, true));
    pppk.forEach(r => countAll(r, false));
    non_asn.forEach(r => countAll(r, false));

    return {
        detail,
        pppk,
        non_asn,
        rekap_pegawai: [...REKAPITULASI_PEGAWAI_ROWS],
        cuti: [...CUTI_ROWS],
        pembinaan: [...PEMBINAAN_ROWS],
        tata_usaha: [...TATA_USAHA_ROWS],
        // Migrate legacy objects to dynamic array structures seamlessly!
        golongan: GOLONGAN_ROWS.map(r => ({ id: r.id, label: r.label, value: golData[r.id] || 0 })),
        jabatan: JABATAN_ROWS.map(r => ({ id: r.id, label: r.label, value: jabData[r.id] || 0 })),
        pendidikan: PENDIDIKAN_ROWS.map(r => ({ id: r.id, label: r.label, value: pendData[r.id] || 0 })),
        gender: GENDER_ROWS.map(r => ({ id: r.id, label: r.label, value: genData[r.id] || 0 })),
        status: STATUS_ROWS.map(r => ({ id: r.id, label: r.label, value: statData[r.id] || 0 })),
        title_golongan: "4.1. Berdasarkan Golongan",
        title_jabatan: "4.2. Berdasarkan Jabatan",
        title_pendidikan: "4.3. Berdasarkan Pendidikan",
        title_gender: "4.4. Berdasarkan Jenis Kelamin",
        title_status: "4.5. Berdasarkan Status"
    };
};

// Helper to parse numeric
const n = (val) => Number(val) || 0;

export const calcTotal = (data) => {
    if (Array.isArray(data)) {
        return data.reduce((sum, item) => sum + n(item.value), 0);
    }
    return Object.values(data || {}).reduce((sum, val) => sum + n(val), 0);
};

export const calcAllTotals = (data) => {
    return {
        golongan: calcTotal(data?.golongan || generateDefaultNumeric(GOLONGAN_ROWS)),
        jabatan: calcTotal(data?.jabatan || generateDefaultNumeric(JABATAN_ROWS)),
        pendidikan: calcTotal(data?.pendidikan || generateDefaultNumeric(PENDIDIKAN_ROWS)),
        gender: calcTotal(data?.gender || generateDefaultNumeric(GENDER_ROWS)),
        status: calcTotal(data?.status || generateDefaultNumeric(STATUS_ROWS)),
        cuti: (data?.cuti || CUTI_ROWS).reduce((s, r) => s + (parseInt(r.jumlah) || 0), 0)
    };
};
