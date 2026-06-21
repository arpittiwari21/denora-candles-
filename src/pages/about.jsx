import React from 'react'
import Title from '../components/Title'
import { assets } from '../assets/assets'
import NewsLetterBox from '../components/NewsLetterBox'

const about = () => {
  return (
    <div>
      
      <div className='text-2xl text-center pt-8 border-t'>
    <Title text1={'ABOUT'} text2={'US'} />
      </div>

      <div className='my-10 flex flex-col md:flex-row gap-16'>
        <img className='w-full md:max-w-[450px]' src={assets.about_img} alt="" />
    <div className='flex flex-col justify-center gap-6 md:w-2/4 text-gray-600'>
    <p>At Denora Candles, we are passionate about creating beautiful, high-quality candles that bring warmth and ambiance to any space. Our mission is to offer unique, artisanal candles made from the finest natural ingredients.</p>
    <p>Each Denora candle is handcrafted with care in small batches using 100% soy wax, premium essential oils, and lead-free cotton wicks. We are committed to using only eco-friendly, sustainable materials that are gentle on the environment. Our candles are free of harmful additives, dyes, and paraffins, ensuring a clean, long-lasting burn.</p>

    <b className='text-gray-800'>Our Mission</b>
    <p>Our mission at Denora Candles is to empower customeras with choice, convenience, and confidence. We're dedicated to providing a seamless shopping experience that exceeds expectations, from browsing and ordering to delivery and beyond.</p>

    </div>
      </div>

    <div className='text-xl py-4' >
      <Title  text1={'WHY'} text2={'CHOOSE US'}/>

    </div>
    <div className='flex flex-col md:flex-row text-sm mb-20'>
      <div className='border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5'>
        <b>Quality Assurance :</b>
        <p className='text-gray-600'>Candles to make you save more
        At Denora Candles, we are all about making you and your home smell great with our fine and calming aromas. Our candles are crafted with pure soy wax to ensure a clean, long-lasting burn that fills your space with soothing scents. </p>
      </div>
      <div className='border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5'>
        <b>Convenience :</b>
        <p className='text-gray-600'>At the core of these artisanal creations lies pure soy wax — a natural, biodegradable, and eco-friendly alternative to paraffin. Unlike paraffin, which is derived from petroleum, soy wax is plant-based, renewable, and burns cleaner and longer. For environmentally-conscious consumers, soy candles offer a guilt-free glow that enhances any space without compromising the planet. </p>
      </div>
      <div className='border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5'>
        <b>Exceptional Customer Services :</b>
        <p className='text-gray-600'>No candle is complete without its wick, and the manufacturers here in Delhi are uncompromising in their use of natural cotton wicks. Free from harmful additives like lead or zinc, cotton wicks ensure a steady, soot-free burn. This attention to detail makes all the difference — creating candles that not only look good but perform exceptionally well. </p>
      </div>

    </div>
    <NewsLetterBox />

    </div>
  )
}

export default about
