--
-- PostgreSQL database dump
--

-- Dumped from database version 16.3
-- Dumped by pg_dump version 16.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    user_id integer NOT NULL,
    wallet character varying(255)
);


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activities (
    id integer NOT NULL,
    user_id integer NOT NULL,
    portfolio_name character varying(100),
    amount numeric(10,2),
    status character varying(50),
    description character varying(100),
    date date
);


ALTER TABLE public.activities OWNER TO postgres;

--
-- Name: activities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activities_id_seq OWNER TO postgres;

--
-- Name: activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activities_id_seq OWNED BY public.activities.id;


--
-- Name: addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.addresses (
    id integer NOT NULL,
    currency character varying(3) NOT NULL,
    address text NOT NULL
);


ALTER TABLE public.addresses OWNER TO postgres;

--
-- Name: addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.addresses_id_seq OWNER TO postgres;

--
-- Name: addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.addresses_id_seq OWNED BY public.addresses.id;


--
-- Name: bots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bots (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    rate numeric(5,2) NOT NULL
);


ALTER TABLE public.bots OWNER TO postgres;

--
-- Name: bots_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bots_id_seq OWNER TO postgres;

--
-- Name: bots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bots_id_seq OWNED BY public.bots.id;


--
-- Name: deposits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deposits (
    id integer NOT NULL,
    user_id integer NOT NULL,
    portfolio character varying(100),
    plan character varying(100),
    curency character varying(10),
    amount numeric(10,2),
    status character varying(50),
    description character varying(100)
);


ALTER TABLE public.deposits OWNER TO postgres;

--
-- Name: deposits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.deposits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.deposits_id_seq OWNER TO postgres;

--
-- Name: deposits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.deposits_id_seq OWNED BY public.deposits.id;


--
-- Name: iv_schemes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.iv_schemes (
    id integer NOT NULL,
    term character varying(50) NOT NULL,
    duration character varying(50) NOT NULL,
    roi numeric NOT NULL,
    active boolean
);


ALTER TABLE public.iv_schemes OWNER TO postgres;

--
-- Name: iv_schemes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.iv_schemes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.iv_schemes_id_seq OWNER TO postgres;

--
-- Name: iv_schemes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.iv_schemes_id_seq OWNED BY public.iv_schemes.id;


--
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_methods (
    id integer NOT NULL,
    name character varying(255),
    active character varying(50)
);


ALTER TABLE public.payment_methods OWNER TO postgres;

--
-- Name: payment_methods_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_methods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_methods_id_seq OWNER TO postgres;

--
-- Name: payment_methods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_methods_id_seq OWNED BY public.payment_methods.id;


--
-- Name: portfolios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.portfolios (
    id integer NOT NULL,
    user_id integer,
    ticker character varying(10),
    plan_id integer,
    payment_method_id integer,
    address character varying(255),
    amount integer,
    status character varying DEFAULT 'Pending'::character varying,
    portfolio_name character varying(255),
    description character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    rate numeric(10,2) DEFAULT 0.00,
    save_pro boolean DEFAULT false,
    unix_time bigint DEFAULT 0,
    curr character varying(10) DEFAULT 'USD'::character varying,
    balance numeric(10,2) DEFAULT 0.00
);


ALTER TABLE public.portfolios OWNER TO postgres;

--
-- Name: portfolios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.portfolios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.portfolios_id_seq OWNER TO postgres;

--
-- Name: portfolios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.portfolios_id_seq OWNED BY public.portfolios.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    transaction_id character varying(255),
    amount numeric(10,2),
    type character varying(100),
    status character varying(50),
    date date,
    unix_time character varying(255),
    currency character varying(10)
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: user_logins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_logins (
    id integer NOT NULL,
    user_id integer NOT NULL,
    login_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    device character varying(255) NOT NULL
);


ALTER TABLE public.user_logins OWNER TO postgres;

--
-- Name: user_logins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_logins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_logins_id_seq OWNER TO postgres;

--
-- Name: user_logins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_logins_id_seq OWNED BY public.user_logins.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(100) NOT NULL,
    phone_number character varying(100),
    address character varying(100),
    city character varying(100),
    full_name character varying(100),
    organization character varying(100),
    zip_code character varying(100),
    wallet_address character varying(100),
    balance double precision,
    profile_picture bytea,
    is_active boolean DEFAULT true
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_user_id_seq OWNER TO postgres;

--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallets (
    id integer NOT NULL,
    btc character varying(255),
    eth character varying(255),
    usdt character varying(100)
);


ALTER TABLE public.wallets OWNER TO postgres;

--
-- Name: wallets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wallets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wallets_id_seq OWNER TO postgres;

--
-- Name: wallets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wallets_id_seq OWNED BY public.wallets.id;


--
-- Name: activities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities ALTER COLUMN id SET DEFAULT nextval('public.activities_id_seq'::regclass);


--
-- Name: addresses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses ALTER COLUMN id SET DEFAULT nextval('public.addresses_id_seq'::regclass);


--
-- Name: bots id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bots ALTER COLUMN id SET DEFAULT nextval('public.bots_id_seq'::regclass);


--
-- Name: deposits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deposits ALTER COLUMN id SET DEFAULT nextval('public.deposits_id_seq'::regclass);


--
-- Name: iv_schemes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.iv_schemes ALTER COLUMN id SET DEFAULT nextval('public.iv_schemes_id_seq'::regclass);


--
-- Name: payment_methods id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods ALTER COLUMN id SET DEFAULT nextval('public.payment_methods_id_seq'::regclass);


--
-- Name: portfolios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portfolios ALTER COLUMN id SET DEFAULT nextval('public.portfolios_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: user_logins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_logins ALTER COLUMN id SET DEFAULT nextval('public.user_logins_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Name: wallets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets ALTER COLUMN id SET DEFAULT nextval('public.wallets_id_seq'::regclass);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (user_id);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: bots bots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bots
    ADD CONSTRAINT bots_pkey PRIMARY KEY (id);


--
-- Name: deposits deposits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deposits
    ADD CONSTRAINT deposits_pkey PRIMARY KEY (id);


--
-- Name: iv_schemes iv_schemes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.iv_schemes
    ADD CONSTRAINT iv_schemes_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: portfolios portfolios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_logins user_logins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_logins
    ADD CONSTRAINT user_logins_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: activities activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: deposits deposits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deposits
    ADD CONSTRAINT deposits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: portfolios portfolios_payment_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id);


--
-- Name: portfolios portfolios_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.iv_schemes(id);


--
-- Name: portfolios portfolios_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: user_logins user_logins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_logins
    ADD CONSTRAINT user_logins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- PostgreSQL database dump complete
--

